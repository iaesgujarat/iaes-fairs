import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { LogoReminderEmail } from "@/emails/LogoReminderEmail";

export const runtime = "nodejs";

/**
 * Admin-triggered logo reminder for a premium registration whose
 * logo hasn't been received yet. Stamps logo_reminder_sent_at.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select(
      `id, pricing_tier, backdrop_received, contact_name, contact_email,
       university_name,
       fair:fairs(name, premium_deadline),
       invoices(proforma_reference)`
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!reg) {
    return NextResponse.json(
      { error: "Registration not found." },
      { status: 404 }
    );
  }
  if (reg.pricing_tier !== "PREMIUM") {
    return NextResponse.json(
      { error: "Not a premium registration." },
      { status: 400 }
    );
  }
  if (reg.backdrop_received) {
    return NextResponse.json(
      { error: "Logo already received — no reminder needed." },
      { status: 400 }
    );
  }

  const fair = Array.isArray(reg.fair) ? reg.fair[0] : reg.fair;
  const proformaRef = Array.isArray(reg.invoices)
    ? reg.invoices[0]?.proforma_reference ?? null
    : null;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email is not configured." },
      { status: 500 }
    );
  }

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: reg.contact_email,
      subject: `⏰ Logo Still Pending — ${fair?.name ?? "IAES Fair"} | ${
        reg.university_name
      }`,
      react: LogoReminderEmail({
        contactName: reg.contact_name,
        universityName: reg.university_name,
        fairName: fair?.name ?? "IAES Fair",
        proformaReference: proformaRef,
        premiumDeadline: fair?.premium_deadline ?? null,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not send reminder." },
      { status: 500 }
    );
  }

  await supabase
    .from("registrations")
    .update({ logo_reminder_sent_at: new Date().toISOString() })
    .eq("id", params.id);

  return NextResponse.json({ success: true });
}
