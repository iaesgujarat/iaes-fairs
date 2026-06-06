import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processSuccessfulPayment } from "@/lib/processPayment";
import type { Currency, Invoice } from "@/types";

export const runtime = "nodejs";

const round2 = (n: number) => Math.round(n * 100) / 100;

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
 * v22 (2A.1) — HARD CONFIRM (manual / offline payment).
 *
 * Offline era: the admin records the payment ACTUALLY agreed/received
 * and we issue the tax invoice to match it exactly (so invoice ⇔ bank).
 *
 *   USD (export of service): invoice_total = the USD amount. No GST.
 *   INR (domestic): invoice_total = the TOTAL INR *inclusive of GST*.
 *     We BACK OUT 18% GST — basic = total − gst, gst = total·18/118 —
 *     and split it by the admin-chosen gst_type:
 *       CGST_SGST → 9% + 9% (intra-Gujarat)
 *       IGST      → 18%      (inter-state)
 *     forex_rate_used is the implied base_inr / base_usd so the invoice
 *     reconciles.
 *
 * We snapshot these onto the proforma, then reuse processSuccessfulPayment
 * (the same finalize Razorpay uses) to mint the TAX invoice, confirm, and
 * email the confirmation + itinerary. amount_credited_inr captures the
 * ACTUAL bank realisation for books / Finance MIS.
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
    invoice_total?: number | string;
    gst_type?: "IGST" | "CGST_SGST";
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

  const invoiceTotal = Number(body.invoice_total);
  const amountCreditedINR = Number(body.amount_credited_inr);
  const bankCreditDate = body.bank_credit_date?.trim();
  const paymentMethod = body.payment_method?.trim();

  if (!Number.isFinite(invoiceTotal) || invoiceTotal <= 0) {
    return NextResponse.json(
      { error: "Invoice total must be a positive number." },
      { status: 422 }
    );
  }
  if (!Number.isFinite(amountCreditedINR) || amountCreditedINR <= 0) {
    return NextResponse.json(
      { error: "Amount credited (INR) must be a positive number." },
      { status: 422 }
    );
  }
  if (!bankCreditDate) {
    return NextResponse.json(
      { error: "Bank credit date is required." },
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
    .select("id, status, payment_currency")
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

  const currency = registration.payment_currency as Currency;

  // Source invoice: a TAX invoice if one already exists, else the proforma.
  const { data: invoicesRaw } = await supabase
    .from("invoices")
    .select("*")
    .eq("registration_id", params.id)
    .order("issued_at", { ascending: false });
  const allInvoices = (invoicesRaw as Invoice[] | null) ?? [];
  const source =
    allInvoices.find((i) => i.invoice_type === "TAX") ??
    allInvoices.find((i) => i.invoice_type === "PROFORMA") ??
    null;
  if (!source) {
    return NextResponse.json(
      { error: "No invoice found for this registration." },
      { status: 404 }
    );
  }

  // ---- Build the final amounts from what was actually received -----
  let snapshot: Partial<Invoice>;
  if (currency === "USD") {
    // Export of service — no GST. Invoice is the USD amount.
    snapshot = {
      base_amount_usd: invoiceTotal,
      base_amount_inr: null,
      gst_type: "NONE",
      cgst_percent: 0,
      cgst_amount: 0,
      sgst_percent: 0,
      sgst_amount: 0,
      igst_percent: 0,
      igst_amount: 0,
      total_amount_usd: invoiceTotal,
      total_amount_inr: null,
      forex_rate_used: null,
      forex_rate_date: null,
      forex_rate_source: null,
      forex_rate_time: null,
    };
  } else {
    // INR — back 18% GST out of the inclusive total; split by type.
    const gstType = body.gst_type === "CGST_SGST" ? "CGST_SGST" : "IGST";
    const gstAmount = round2((invoiceTotal * 18) / 118);
    const baseINR = round2(invoiceTotal - gstAmount);
    const baseUSD = Number(source.base_amount_usd ?? 0);
    const forexRate = baseUSD > 0 ? round2(baseINR / baseUSD) : null;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let cgstPercent = 0;
    let sgstPercent = 0;
    let igstPercent = 0;
    if (gstType === "CGST_SGST") {
      cgstAmount = round2(gstAmount / 2);
      sgstAmount = round2(gstAmount - cgstAmount); // keep the sum exact
      cgstPercent = 9;
      sgstPercent = 9;
    } else {
      igstAmount = gstAmount;
      igstPercent = 18;
    }

    snapshot = {
      base_amount_usd: source.base_amount_usd, // keep the USD reference
      base_amount_inr: baseINR,
      gst_type: gstType,
      cgst_percent: cgstPercent,
      cgst_amount: cgstAmount,
      sgst_percent: sgstPercent,
      sgst_amount: sgstAmount,
      igst_percent: igstPercent,
      igst_amount: igstAmount,
      total_amount_usd: null,
      total_amount_inr: invoiceTotal,
      forex_rate_used: forexRate,
      forex_rate_date: bankCreditDate,
      forex_rate_source: "Manual (offline payment)",
      forex_rate_time: null,
    };
  }

  await supabase.from("invoices").update(snapshot).eq("id", source.id);

  // Record the manual payment (audit + reconciliation).
  const { data: paymentRow, error: payErr } = await supabase
    .from("payments")
    .insert({
      invoice_id: source.id,
      registration_id: params.id,
      amount_paid: invoiceTotal,
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

  // Reuse the canonical finalize → TAX invoice + confirm + email.
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
