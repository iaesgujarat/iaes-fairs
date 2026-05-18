import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpay, toMinorUnit } from "@/lib/razorpay";
import { calculateGST } from "@/lib/gst";
import { getLiveForexRate } from "@/lib/forex";
import type { Currency, Invoice } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { registrationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.registrationId) {
    return NextResponse.json(
      { error: "registrationId is required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Pull registration + billing for GST inputs (INR proforma path)
  const { data: registration, error: regErr } = await supabase
    .from("registrations")
    .select(
      `id, status, contact_email, contact_name, contact_phone,
       university_name, payment_currency,
       billing:billing_details(state, is_gst_registered)`
    )
    .eq("id", body.registrationId)
    .maybeSingle();

  if (regErr || !registration) {
    return NextResponse.json(
      { error: "Registration not found." },
      { status: 404 }
    );
  }

  if (registration.status === "paid" || registration.status === "confirmed") {
    return NextResponse.json(
      { error: "This registration is already paid." },
      { status: 409 }
    );
  }

  type Billing = { state?: string | null; is_gst_registered?: boolean | null };
  const billing = (
    Array.isArray(registration.billing)
      ? registration.billing[0]
      : registration.billing
  ) as Billing | null | undefined;

  // Prefer a TAX invoice if one already exists (e.g. legacy gateway-on
  // flow). Otherwise we're paying off a proforma — compute final
  // amounts now and snapshot them onto the proforma row.
  const { data: invoicesRaw } = await supabase
    .from("invoices")
    .select("*")
    .eq("registration_id", body.registrationId)
    .order("issued_at", { ascending: false });

  const allInvoices = (invoicesRaw as Invoice[] | null) || [];
  const taxInvoice = allInvoices.find((i) => i.invoice_type === "TAX") ?? null;
  const proformaInvoice =
    allInvoices.find((i) => i.invoice_type === "PROFORMA") ?? null;
  const invoice = taxInvoice ?? proformaInvoice;

  if (!invoice) {
    return NextResponse.json(
      { error: "Invoice not found for this registration." },
      { status: 404 }
    );
  }

  if (
    !process.env.RAZORPAY_KEY_SECRET ||
    !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  ) {
    return NextResponse.json(
      {
        error:
          "Razorpay is not configured. Set the keys in environment variables.",
      },
      { status: 500 }
    );
  }

  const currency = invoice.payment_currency as Currency;
  let payableMajor: number;
  let snapshotInvoice = invoice;

  if (invoice.invoice_type === "PROFORMA") {
    // v8 path — compute live forex + GST AT THIS MOMENT and snapshot
    // onto the proforma row so the webhook uses the same numbers.
    const baseUSD = Number(invoice.base_amount_usd ?? 0);
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

    const snapshot = {
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
    };

    const { data: updated } = await supabase
      .from("invoices")
      .update(snapshot)
      .eq("id", invoice.id)
      .select()
      .maybeSingle();
    if (updated) snapshotInvoice = updated as Invoice;

    payableMajor =
      currency === "INR" ? gst.totalAmountINR : gst.totalAmountUSD;
  } else {
    // Legacy TAX-invoice path — read existing total
    payableMajor =
      currency === "INR"
        ? Number(invoice.total_amount_inr)
        : Number(invoice.total_amount_usd);
  }

  if (!payableMajor || payableMajor <= 0) {
    return NextResponse.json(
      { error: "Invoice has no payable total." },
      { status: 500 }
    );
  }

  const amountMinor = toMinorUnit(payableMajor, currency);

  const razorpay = getRazorpay();
  let order;
  try {
    order = await razorpay.orders.create({
      amount: amountMinor,
      currency,
      // For proformas the official invoice_number doesn't exist yet —
      // use the proforma reference so Razorpay has a meaningful receipt.
      receipt:
        snapshotInvoice.invoice_number ||
        snapshotInvoice.proforma_reference ||
        snapshotInvoice.id,
      notes: {
        registration_id: registration.id,
        invoice_id: snapshotInvoice.id,
        proforma_reference: snapshotInvoice.proforma_reference || "",
        university_name: registration.university_name,
      },
    });
  } catch (e) {
    console.error("Razorpay order failed:", e);
    return NextResponse.json(
      {
        error:
          currency === "USD"
            ? "Could not create USD order. Confirm Razorpay International is enabled on this account."
            : "Could not create Razorpay order.",
      },
      { status: 502 }
    );
  }

  await supabase.from("payments").insert({
    invoice_id: snapshotInvoice.id,
    registration_id: registration.id,
    razorpay_order_id: order.id,
    amount_paid: payableMajor,
    currency,
    payment_status: "initiated",
  });

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    prefill: {
      name: registration.contact_name,
      email: registration.contact_email,
      contact: registration.contact_phone || "",
    },
    // No invoice_number yet on proforma path — that's generated in the
    // webhook after capture. Return the proforma ref for UX continuity.
    invoiceNumber:
      snapshotInvoice.invoice_number ||
      snapshotInvoice.proforma_reference ||
      null,
  });
}
