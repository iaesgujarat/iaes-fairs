import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { ConfirmationEmail } from "@/emails/ConfirmationEmail";
import type { Currency, Fair, Invoice } from "@/types";

type Supabase = ReturnType<typeof createAdminClient>;

export interface ProcessResult {
  mode: "legacy-tax" | "proforma-to-tax" | "idempotent" | "skipped";
  invoiceNumber?: string | null;
}

/**
 * Finalise a successful Razorpay payment.
 *
 * Called from BOTH the client-side verify route (sync, user is
 * waiting on the response) AND the server-side Razorpay webhook
 * (async, authoritative). Both paths must be idempotent — re-running
 * does not re-issue invoice numbers or double-confirm.
 *
 * Branches:
 *   - source invoice is TAX  → legacy gateway-on flow: mark paid +
 *                              confirm registration
 *   - source invoice is PROFORMA (v8) → generate official invoice
 *                              number now, INSERT a TAX invoice using
 *                              the snapshot stored on the proforma at
 *                              order-creation time, mark both paid,
 *                              confirm registration. If a TAX invoice
 *                              already exists for the registration,
 *                              treat as idempotent.
 */
export async function processSuccessfulPayment(
  supabase: Supabase,
  paymentRow: {
    id: string;
    invoice_id: string;
    registration_id: string;
  }
): Promise<ProcessResult> {
  const { data: sourceInv } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", paymentRow.invoice_id)
    .maybeSingle();
  const source = sourceInv as Invoice | null;
  if (!source) {
    return { mode: "skipped" };
  }

  // Legacy TAX-invoice path
  if (source.invoice_type === "TAX") {
    await supabase
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", source.id);
    await supabase
      .from("registrations")
      .update({ status: "confirmed" })
      .eq("id", paymentRow.registration_id);
    await sendConfirmation(supabase, paymentRow.registration_id, source);
    return { mode: "legacy-tax", invoiceNumber: source.invoice_number };
  }

  // Proforma path — check whether a TAX invoice has already been
  // generated for this registration (idempotency).
  const { data: existingTax } = await supabase
    .from("invoices")
    .select("*")
    .eq("registration_id", paymentRow.registration_id)
    .eq("invoice_type", "TAX")
    .maybeSingle();

  if (existingTax) {
    await supabase
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", (existingTax as Invoice).id);
    await supabase
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", source.id);
    await supabase
      .from("registrations")
      .update({ status: "confirmed" })
      .eq("id", paymentRow.registration_id);
    return {
      mode: "idempotent",
      invoiceNumber: (existingTax as Invoice).invoice_number,
    };
  }

  // First time we're seeing capture for this proforma — issue the
  // official invoice number.
  // FY-keyed number; the function maps currency → DOMESTIC (INR) /
  // EXPORT (USD) series. Per GST Rule 46, the two series can coexist
  // as long as each is sequential within itself.
  const currency = source.payment_currency as Currency;
  const { data: numberRow, error: rpcErr } = await supabase.rpc(
    "generate_invoice_number",
    { p_currency: currency }
  );
  if (rpcErr || !numberRow) {
    console.error("generate_invoice_number RPC failed:", rpcErr);
    return { mode: "skipped" };
  }
  const invoiceNumber = String(numberRow);

  const { data: taxInsert } = await supabase
    .from("invoices")
    .insert({
      registration_id: paymentRow.registration_id,
      invoice_number: invoiceNumber,
      invoice_type: "TAX",
      proforma_reference: source.proforma_reference,
      payment_currency: source.payment_currency,
      forex_rate_used: source.forex_rate_used,
      forex_rate_date: source.forex_rate_date,
      forex_rate_source: source.forex_rate_source ?? null,
      forex_rate_time: source.forex_rate_time ?? null,
      base_amount_usd: source.base_amount_usd,
      base_amount_inr: source.base_amount_inr,
      gst_type: source.gst_type,
      cgst_percent: source.cgst_percent,
      cgst_amount: source.cgst_amount,
      sgst_percent: source.sgst_percent,
      sgst_amount: source.sgst_amount,
      igst_percent: source.igst_percent,
      igst_amount: source.igst_amount,
      total_amount_usd: source.total_amount_usd,
      total_amount_inr: source.total_amount_inr,
      due_date: source.due_date,
      status: "paid",
    })
    .select()
    .single();

  await supabase
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", source.id);

  await supabase
    .from("registrations")
    .update({ status: "confirmed" })
    .eq("id", paymentRow.registration_id);

  if (taxInsert) {
    await supabase
      .from("payments")
      .update({ invoice_id: (taxInsert as Invoice).id })
      .eq("id", paymentRow.id);
  }

  await sendConfirmation(
    supabase,
    paymentRow.registration_id,
    (taxInsert as Invoice | null) ?? source
  );

  return { mode: "proforma-to-tax", invoiceNumber };
}

async function sendConfirmation(
  supabase: Supabase,
  registrationId: string,
  invoice: Invoice
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { data: regJoin } = await supabase
      .from("registrations")
      .select(`*, fair:fairs(*)`)
      .eq("id", registrationId)
      .maybeSingle();
    if (!regJoin) return;
    const fair = regJoin.fair as Fair;
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: regJoin.contact_email,
      subject: `Booking confirmed — ${fair.name} · ${invoice.invoice_number ?? ""}`,
      react: ConfirmationEmail({
        contactName: regJoin.contact_name,
        universityName: regJoin.university_name,
        fairName: fair.name,
        fairDate: fair.fair_date_start || fair.fair_date,
        venue: fair.venue || fair.city,
        boothType: regJoin.booth_type,
        invoiceNumber: invoice.invoice_number ?? "",
        paymentCurrency: invoice.payment_currency,
        amountPaidUSD: invoice.total_amount_usd
          ? Number(invoice.total_amount_usd)
          : null,
        amountPaidINR: invoice.total_amount_inr
          ? Number(invoice.total_amount_inr)
          : null,
      }),
    });
  } catch (e) {
    console.error("Confirmation email failed:", e);
  }
}
