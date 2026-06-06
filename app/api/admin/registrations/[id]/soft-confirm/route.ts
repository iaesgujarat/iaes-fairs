import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { SoftConfirmEmail } from "@/emails/SoftConfirmEmail";
import {
  registerWhatsAppContact,
  sendWhatsAppTemplate,
  WA_TEMPLATES,
} from "@/lib/whatsappNotify";
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
 * v22 — admin "Soft confirm / hold": acknowledge a registration as a
 * reserved spot BEFORE payment. Sets status='soft_confirmed' and sends
 * the rep a "spot reserved, payment pending" note. Does NOT mint a tax
 * invoice or take money — that's the hard-confirm path. Blocked once a
 * registration is genuinely paid/confirmed.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select(
      `id, status, contact_name, contact_email, contact_phone,
       university_name, university_country, fair_id, whatsapp_consent,
       fair:fairs(name, fair_date, fair_date_start)`
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!reg) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }
  if (reg.status === "paid" || reg.status === "confirmed") {
    return NextResponse.json(
      { error: "Already confirmed/paid — soft confirm doesn't apply." },
      { status: 409 }
    );
  }
  if (reg.status === "cancelled") {
    return NextResponse.json(
      { error: "This registration is cancelled." },
      { status: 409 }
    );
  }

  const { error: updErr } = await supabase
    .from("registrations")
    .update({ status: "soft_confirmed" })
    .eq("id", params.id);
  if (updErr) {
    return NextResponse.json(
      { error: updErr.message || "Could not soft-confirm." },
      { status: 500 }
    );
  }

  const fair = (Array.isArray(reg.fair) ? reg.fair[0] : reg.fair) as
    | Pick<Fair, "name" | "fair_date" | "fair_date_start">
    | null;
  const fairName = fair?.name ?? "IAES Education Fair";

  // Best-effort email — never fail the status change over a mail hiccup.
  let emailed = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: reg.contact_email as string,
        subject: `Spot reserved — ${fairName}`,
        react: SoftConfirmEmail({
          contactName: reg.contact_name as string,
          universityName: reg.university_name as string,
          fairName,
          fairDate: fair?.fair_date_start || fair?.fair_date || "",
        }),
      });
      emailed = true;
    } catch (e) {
      console.error("Soft-confirm email failed:", e);
    }
  }

  // WhatsApp "spot reserved" note — shows the rep we're on it. Keeps the
  // cross-fair registry fresh, then sends the (utility) template. Both
  // are fire-and-forget; no-op for a number we can't resolve or while
  // the template/channel is dark. University reps get no default CC —
  // a bare number simply isn't WhatsApp'd (email already covers them).
  await registerWhatsAppContact(supabase, {
    rawPhone: reg.contact_phone as string | null,
    name: reg.contact_name as string,
    audience: "university",
    country: reg.university_country as string | null,
    fairId: reg.fair_id as string | null,
    consent: !!reg.whatsapp_consent,
  });
  await sendWhatsAppTemplate(supabase, {
    fairId: reg.fair_id as string | null,
    rawPhone: reg.contact_phone as string | null,
    template: WA_TEMPLATES.SPOT_RESERVED,
    context: "soft_confirm",
    bodyParams: [reg.contact_name as string, fairName],
  });

  return NextResponse.json({ ok: true, status: "soft_confirmed", emailed });
}
