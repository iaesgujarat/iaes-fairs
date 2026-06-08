import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { InvoiceEmail } from "@/emails/InvoiceEmail";
import { renderInvoiceAttachment } from "@/lib/invoicePdf";
import { w8Attachment } from "@/lib/w8";
import { getAttnRecipient, billingCc } from "@/lib/billTo";
import type {
  Fair,
  Currency,
  Registration,
  Invoice,
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

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Resend is not configured." },
      { status: 503 }
    );
  }

  const supabase = createAdminClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select(`*, fair:fairs(*), invoice:invoices(*), billing:billing_details(*)`)
    .eq("id", params.id)
    .maybeSingle();

  if (!reg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const invoice = (
    Array.isArray(reg.invoice) ? reg.invoice[0] : reg.invoice
  ) as Invoice;
  const fair = reg.fair as Fair;
  const billing = (Array.isArray(reg.billing)
    ? reg.billing[0]
    : reg.billing) as BillingDetails | null;
  if (!invoice || !fair) {
    return NextResponse.json(
      { error: "Missing invoice or fair." },
      { status: 422 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://fairs.iaesgujarat.org";
  const payUrl = `${appUrl}/payment/${reg.id}`;

  const pdf = await renderInvoiceAttachment(supabase, {
    registration: reg as Registration,
    invoice,
    fair,
    billing,
  });
  const cc = billingCc(reg as Registration, reg.contact_email);

  // USD invoices carry IAES's W-8BEN-E (US foreign-status cert).
  const attachmentList = [pdf, w8Attachment(invoice.payment_currency)].filter(
    Boolean
  ) as NonNullable<typeof pdf>[];

  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: reg.contact_email,
    cc: cc ? [cc] : undefined,
    attachments: attachmentList.length ? attachmentList : undefined,
    subject: `Reminder: Invoice for ${fair.name} — ${reg.university_name}`,
    react: InvoiceEmail({
      contactName: reg.contact_name,
      universityName: reg.university_name,
      fairName: fair.name,
      invoiceNumber: invoice.invoice_number ?? "",
      paymentCurrency: invoice.payment_currency as Currency,
      totalAmountUSD: invoice.total_amount_usd
        ? Number(invoice.total_amount_usd)
        : null,
      totalAmountINR: invoice.total_amount_inr
        ? Number(invoice.total_amount_inr)
        : null,
      dueDate: fair.registration_deadline,
      payUrl,
      addressedTo: getAttnRecipient(reg as Registration)?.name ?? null,
    }),
  });

  return NextResponse.json({ ok: true });
}
