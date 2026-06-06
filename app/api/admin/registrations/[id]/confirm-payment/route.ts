import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateGST } from "@/lib/gst";
import { getLiveForexRate } from "@/lib/forex";
import { processSuccessfulPayment } from "@/lib/processPayment";
import type { Currency, Invoice } from "@/types";

export const runtime = "nodejs";

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_users")
    .select("email")
    .eq("email", user.email!)
    .maybeSingle();
  return data ? user : null;
}

/**
 * v22 — HARD CONFIRM (manual / offline payment). The admin records a
 * received payment; we capture the bank-reconciliation details, snapshot
 * final forex+GST onto the proforma (so the INR is accurate as of today,
 * not the indicative figure), insert a 'manual' payments row, then reuse
 * processSuccessfulPayment() — the SAME finalize logic Razorpay uses —
 * to mint the TAX invoice, mark paid, set 'confirmed', and email the
 * confirmation + itinerary. Idempotent via processSuccessfulPayment.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    bank_credit_date?: string;
    reference_number?: string;
    amount_credited_inr?: number | string;
    payment_method?: string;
    remitter_name?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bankCreditDate = body.bank_credit_date?.trim();
  const amountCreditedINR = Number(body.amount_credited_inr);
  const paymentMethod = body.payment_method?.trim();
  if (!bankCreditDate) {
    return NextResponse.json(
      { error: "Bank credit date is required." },
      { status: 422 }
    );
  }
  if (!Number.isFinite(amountCreditedINR) || amountCreditedINR <= 0) {
    return NextResponse.json(
      { error: "Amount credited (INR) must be a positive number." },
      { status: 422 }
    );
  }
  if (!paymentMethod) {
    return NextResponse.json(
      { error: "Payment method is required." },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();

  const { data: registration } = await supabase
    .from("registrations")
    .select(
      `id, status, payment_currency,
       billing:billing_details(state, is_gst_registered)`
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!registration) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }
  if (registration.status === "paid" || registration.status === "confirmed") {
    return NextResponse.json(
      { error: "This registration is already paid/confirmed." },
      { status: 409 }
    );
  }
  if (registration.status === "cancelled") {
    return NextResponse.json(
      { error: "This registration is cancelled." },
      { status: 409 }
    );
  }

  type Billing = { state?: string | null; is_gst_registered?: boolean | null };
  const billing = (
    Array.isArray(registration.billing)
      ? registration.billing[0]
      : registration.billing
  ) as Billing | null | undefined;
  const currency = registration.payment_currency as Currency;

  // Source invoice: a TAX invoice if one already exists, else the proforma.
  const { data: invoicesRaw } = await supabase
    .from("invoices")
    .select("*")
    .eq("registration_id", params.id)
    .order("issued_at", { ascending: false });
  const allInvoices = (invoicesRaw as Invoice[] | null) ?? [];
  const taxInvoice = allInvoices.find((i) => i.invoice_type === "TAX") ?? null;
  const proformaInvoice =
    allInvoices.find((i) => i.invoice_type === "PROFORMA") ?? null;
  const source = taxInvoice ?? proformaInvoice;
  if (!source) {
    return NextResponse.json(
      { error: "No invoice found for this registration." },
      { status: 404 }
    );
  }

  // For a proforma, compute final forex+GST NOW and snapshot it, so the
  // TAX invoice processSuccessfulPayment mints carries accurate numbers
  // (mirrors the Razorpay create-order path). Legacy TAX invoices already
  // hold their final amounts.
  let amountPaidMajor: number;
  if (source.invoice_type === "PROFORMA") {
    const baseUSD = Number(source.base_amount_usd ?? 0);
    let forexRate: number | null = null;
    let forexDate: string | null = null;
    let forexSource: string | null = null;
    let forexTime: string | null = null;
    if (currency === "INR") {
      const live = await getLiveForexRate();
      forexRate = live.rate;
      forexDate = live.date;
      forexSource = live.source;
      forexTime = live.time;
    }
    const gst = calculateGST(
      currency,
      baseUSD,
      forexRate ?? 0,
      billing?.state ?? null,
      !!billing?.is_gst_registered
    );
    await supabase
      .from("invoices")
      .update({
        forex_rate_used: forexRate,
        forex_rate_date: forexDate,
        forex_rate_source: forexSource,
        forex_rate_time: forexTime,
        base_amount_usd: gst.baseAmountUSD,
        base_amount_inr: currency === "INR" ? gst.baseAmountINR : null,
        gst_type: gst.gstType,
        cgst_percent: gst.cgstPercent,
        cgst_amount: gst.cgstAmount,
        sgst_percent: gst.sgstPercent,
        sgst_amount: gst.sgstAmount,
        igst_percent: gst.igstPercent,
        igst_amount: gst.igstAmount,
        total_amount_usd: currency === "USD" ? gst.totalAmountUSD : null,
        total_amount_inr: currency === "INR" ? gst.totalAmountINR : null,
      })
      .eq("id", source.id);
    amountPaidMajor =
      currency === "INR" ? gst.totalAmountINR : gst.totalAmountUSD;
  } else {
    amountPaidMajor =
      currency === "INR"
        ? Number(source.total_amount_inr ?? 0)
        : Number(source.total_amount_usd ?? 0);
  }

  // Record the manual payment (the audit row processSuccessfulPayment
  // also re-points to the minted TAX invoice).
  const { data: paymentRow, error: payErr } = await supabase
    .from("payments")
    .insert({
      invoice_id: source.id,
      registration_id: params.id,
      amount_paid: amountPaidMajor,
      currency,
      payment_method: paymentMethod,
      payment_status: "success",
      paid_at: new Date(bankCreditDate).toISOString(),
      entry_mode: "manual",
      bank_credit_date: bankCreditDate,
      reference_number: body.reference_number?.trim() || null,
      amount_credited_inr: amountCreditedINR,
      remitter_name: body.remitter_name?.trim() || null,
      notes: body.notes?.trim() || null,
      recorded_by: user.email ?? null,
    })
    .select("id, invoice_id, registration_id")
    .single();
  if (payErr || !paymentRow) {
    return NextResponse.json(
      { error: payErr?.message || "Could not record payment." },
      { status: 500 }
    );
  }

  // Reuse the canonical finalize path → TAX invoice + confirm + email.
  const result = await processSuccessfulPayment(supabase, {
    id: paymentRow.id,
    invoice_id: paymentRow.invoice_id,
    registration_id: paymentRow.registration_id,
  });

  if (result.mode === "skipped") {
    return NextResponse.json(
      { error: "Payment recorded, but invoice finalization failed. Check logs." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: "confirmed",
    invoiceNumber: result.invoiceNumber ?? null,
  });
}
