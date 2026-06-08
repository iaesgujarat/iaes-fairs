import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { ProformaEmail } from "@/emails/ProformaEmail";
import { InvoiceEmail } from "@/emails/InvoiceEmail";
import { formatFairDateRange } from "@/lib/mailerHelpers";
import { getAttnRecipient, billingCc } from "@/lib/billTo";
import { renderInvoiceAttachment } from "@/lib/invoicePdf";
import { w8Attachment } from "@/lib/w8";
import type {
  Fair,
  Invoice,
  Registration,
  Currency,
  BillingDetails,
} from "@/types";

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
 * Re-send the current proforma (or unpaid invoice) notification to the
 * registrant, CC-ing the Mode-A "Attn:" recipient when they opted in.
 * Used after admin changes the billed party / recipient.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Resend is not configured." }, { status: 503 });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("registrations")
    .select(`*, fair:fairs(*), invoices:invoices(*), billing:billing_details(*)`)
    .eq("id", params.id)
    .maybeSingle();
  if (!data) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  const reg = data as Registration;
  const fair = (Array.isArray(data.fair) ? data.fair[0] : data.fair) as Fair;
  const billing = (Array.isArray(data.billing)
    ? data.billing[0]
    : data.billing) as BillingDetails | null;
  const invoices = (
    Array.isArray(data.invoices) ? data.invoices : [data.invoices]
  ) as Invoice[];
  const active =
    invoices.find((i) => i && i.invoice_type === "TAX") ??
    invoices.find((i) => i && i.invoice_type === "PROFORMA") ??
    null;
  if (!active || !fair) {
    return NextResponse.json({ error: "No invoice to send." }, { status: 422 });
  }

  const cc = billingCc(reg, reg.contact_email);
  const addressedTo = getAttnRecipient(reg)?.name ?? null;
  const pdf = await renderInvoiceAttachment(supabase, {
    registration: reg,
    invoice: active,
    fair,
    billing,
  });
  // USD documents carry IAES's W-8BEN-E (US foreign-status cert).
  const attachmentList = [pdf, w8Attachment(active.payment_currency)].filter(
    Boolean
  ) as NonNullable<typeof pdf>[];
  const attachments = attachmentList.length ? attachmentList : undefined;
  const resend = getResend();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://fairs.iaesgujarat.org";

  try {
    if (active.invoice_type === "PROFORMA") {
      const extraTableUSD = Number(fair.price_extra_table_usd ?? 300);
      const extraRepUSD = Number(fair.price_extra_rep_usd ?? 100);
      const addonTables = Number(reg.addon_tables || 0);
      const addonReps = Number(reg.addon_reps || 0);
      const baseUSD = Number(active.base_amount_usd ?? 0);
      await resend.emails.send({
        from: FROM_EMAIL,
        to: reg.contact_email,
        cc: cc ? [cc] : undefined,
        attachments,
        subject: `Your proforma — ${fair.name} (${active.proforma_reference})`,
        react: ProformaEmail({
          contactName: reg.contact_name,
          universityName: reg.university_name,
          fairName: fair.name,
          fairDateRange: formatFairDateRange(fair),
          proformaReference: active.proforma_reference ?? "",
          paymentCurrency: active.payment_currency,
          baseAmountUSD: baseUSD,
          indicativeINR: active.base_amount_inr
            ? Number(active.base_amount_inr)
            : null,
          forexRate: active.forex_rate_used ? Number(active.forex_rate_used) : null,
          forexDate: active.forex_rate_date ?? null,
          addonTables,
          addonReps,
          addonTablesCostUSD: addonTables * extraTableUSD,
          addonRepsCostUSD: addonReps * extraRepUSD,
          tierLabel: reg.pricing_tier === "EARLYBIRD" ? "Early Bird" : "Standard",
          totalUSD: baseUSD,
          addressedTo,
        }),
      });
    } else {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: reg.contact_email,
        cc: cc ? [cc] : undefined,
        attachments,
        subject: `Invoice for ${fair.name} — ${active.invoice_number}`,
        react: InvoiceEmail({
          contactName: reg.contact_name,
          universityName: reg.university_name,
          fairName: fair.name,
          invoiceNumber: active.invoice_number ?? "",
          paymentCurrency: active.payment_currency as Currency,
          totalAmountUSD: active.total_amount_usd
            ? Number(active.total_amount_usd)
            : null,
          totalAmountINR: active.total_amount_inr
            ? Number(active.total_amount_inr)
            : null,
          dueDate: fair.registration_deadline,
          payUrl: `${appUrl}/payment/${reg.id}`,
          addressedTo,
        }),
      });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, cc: cc ?? null });
}
