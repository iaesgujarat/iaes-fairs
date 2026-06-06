import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { BoothScannerEmail } from "@/emails/BoothScannerEmail";
import { appUrl } from "@/lib/mailerHelpers";
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

/**
 * Send each participating university its "booth scanner is ready" email —
 * the pre-bound scan link, manual fallback, leads-portal link, and guide.
 * Admin-triggered (~1 week before the fair); a cron can call this later.
 * Goes to every non-cancelled registration for the fair.
 */
export async function POST(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email is not configured (RESEND_API_KEY)." },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();

  const { data: fair } = await supabase
    .from("fairs")
    .select("id, name, fair_date, fair_date_start")
    .eq("id", params.fairId)
    .maybeSingle();
  if (!fair) {
    return NextResponse.json({ error: "Fair not found." }, { status: 404 });
  }
  const f = fair as Pick<Fair, "id" | "name" | "fair_date" | "fair_date_start">;

  const { data: regs } = await supabase
    .from("registrations")
    .select(
      `id, contact_name, contact_email, university_name, status,
       invoices(invoice_number, proforma_reference)`
    )
    .eq("fair_id", params.fairId)
    .neq("status", "cancelled");

  const base = appUrl();
  const resend = getResend();
  let sent = 0;
  let failed = 0;

  for (const reg of regs ?? []) {
    if (!reg.contact_email) {
      failed += 1;
      continue;
    }
    const invoices =
      (reg.invoices as
        | { invoice_number: string | null; proforma_reference: string | null }[]
        | null) ?? [];
    const invoiceNumber =
      invoices.find((i) => i.invoice_number)?.invoice_number ??
      invoices.find((i) => i.proforma_reference)?.proforma_reference ??
      "—";
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: reg.contact_email as string,
        subject: `Your booth scanner is ready — ${f.name}`,
        react: BoothScannerEmail({
          contactName: (reg.contact_name as string) ?? "there",
          universityName: (reg.university_name as string) ?? "your university",
          fairName: f.name,
          fairDate: f.fair_date_start || f.fair_date || "",
          scanUrl: `${base}/scan?b=${reg.id}`,
          portalUrl: `${base}/portal/${reg.id}/students`,
          guideUrl: `${base}/guide`,
          invoiceNumber,
        }),
      });
      sent += 1;
    } catch (e) {
      console.error("Scanner-guide email failed for", reg.id, e);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}
