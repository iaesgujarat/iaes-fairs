import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { InvoiceEmail } from "@/emails/InvoiceEmail";
import type { Fair } from "@/types";

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
    .select(`*, fair:fairs(*), invoice:invoices(*)`)
    .eq("id", params.id)
    .maybeSingle();

  if (!reg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const invoice = Array.isArray(reg.invoice) ? reg.invoice[0] : reg.invoice;
  const fair = reg.fair as Fair;
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

  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: reg.contact_email,
    subject: `Reminder: Invoice for ${fair.name} — ${reg.university_name}`,
    react: InvoiceEmail({
      contactName: reg.contact_name,
      universityName: reg.university_name,
      fairName: fair.name,
      invoiceNumber: invoice.invoice_number,
      amountInr: Number(invoice.total_amount_inr),
      dueDate: fair.registration_deadline,
      payUrl,
    }),
  });

  return NextResponse.json({ ok: true });
}
