import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { SubscriberAnnouncementEmail } from "@/emails/SubscriberAnnouncementEmail";
import {
  sendWhatsAppTemplate,
  alreadySentWhatsApp,
  WA_TEMPLATES,
} from "@/lib/whatsappNotify";
import { appUrl, formatFairDateRange } from "@/lib/mailerHelpers";
import type { Fair } from "@/types";

export const runtime = "nodejs";

type Audience = "university" | "student";
type Channel = "whatsapp" | "email";

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
 * v21 Phase B — announce a fair to the standing audience.
 *   WhatsApp → whatsapp_contacts (active + consented, by audience),
 *              fair_announcement template, button → /fair/<id>.
 *              Deduped via whatsapp_sends; STOP-aware (is_active).
 *   Email    → announcement_leads (email-consented, by role),
 *              deduped via announcement_email_sends.
 * Pass `test` to send a single preview to yourself first.
 */
export async function POST(
  req: Request,
  { params }: { params: { fairId: string } }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    audiences?: Audience[];
    channels?: Channel[];
    test?: { email?: string; phone?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const audiences = (body.audiences ?? []).filter(
    (a): a is Audience => a === "university" || a === "student"
  );
  const channels = (body.channels ?? []).filter(
    (c): c is Channel => c === "whatsapp" || c === "email"
  );
  if (channels.length === 0) {
    return NextResponse.json({ error: "Pick at least one channel." }, { status: 422 });
  }
  if (!body.test && audiences.length === 0) {
    return NextResponse.json({ error: "Pick at least one audience." }, { status: 422 });
  }

  const supabase = createAdminClient();
  const { data: fairRow } = await supabase
    .from("fairs")
    .select("*")
    .eq("id", params.fairId)
    .maybeSingle();
  if (!fairRow) {
    return NextResponse.json({ error: "Fair not found." }, { status: 404 });
  }
  const fair = fairRow as Fair;
  const fairWhen =
    formatFairDateRange(fair) + (fair.city ? ` · ${fair.city}` : "");
  const registerUrl = `${appUrl()}/fair/${params.fairId}`;
  const resend = getResend();

  // ---- Test send: one preview to yourself, then stop -----------
  if (body.test) {
    const out: Record<string, unknown> = { test: true };
    if (channels.includes("whatsapp") && body.test.phone) {
      await sendWhatsAppTemplate(supabase, {
        fairId: params.fairId,
        rawPhone: body.test.phone,
        template: WA_TEMPLATES.FAIR_ANNOUNCEMENT,
        context: "fair_announcement_test",
        bodyParams: ["there", fair.name, fairWhen],
        urlButtonParam: params.fairId,
      });
      out.whatsapp = "attempted";
    }
    if (channels.includes("email") && body.test.email) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: body.test.email,
          subject: `Registrations open — ${fair.name}`,
          react: SubscriberAnnouncementEmail({
            contactName: "there",
            fairName: fair.name,
            fairWhen,
            registerUrl,
          }),
        });
        out.email = "sent";
      } catch (e) {
        out.email = "failed";
        console.error("Announcement test email failed:", e);
      }
    }
    return NextResponse.json(out);
  }

  let waSent = 0;
  let emailSent = 0;

  // ---- WhatsApp → whatsapp_contacts ----------------------------
  if (channels.includes("whatsapp")) {
    const { data: contacts } = await supabase
      .from("whatsapp_contacts")
      .select("phone_e164, name, audience")
      .eq("is_active", true)
      .eq("consent", true)
      .in("audience", audiences);
    for (const c of contacts ?? []) {
      const phone = c.phone_e164 as string;
      if (
        await alreadySentWhatsApp(
          supabase,
          params.fairId,
          phone,
          WA_TEMPLATES.FAIR_ANNOUNCEMENT
        )
      ) {
        continue;
      }
      await sendWhatsAppTemplate(supabase, {
        fairId: params.fairId,
        rawPhone: phone,
        template: WA_TEMPLATES.FAIR_ANNOUNCEMENT,
        context: "fair_announcement",
        bodyParams: [(c.name as string) || "there", fair.name, fairWhen],
        urlButtonParam: params.fairId,
      });
      waSent += 1;
    }
  }

  // ---- Email → announcement_leads ------------------------------
  if (channels.includes("email")) {
    const { data: leads } = await supabase
      .from("announcement_leads")
      .select("email, full_name, role")
      .eq("is_active", true)
      .eq("email_consent", true)
      .in("role", audiences);
    for (const lead of leads ?? []) {
      const email = (lead.email as string).toLowerCase();
      // Dedupe: skip if this fair already emailed this address.
      const { data: already } = await supabase
        .from("announcement_email_sends")
        .select("id")
        .eq("fair_id", params.fairId)
        .eq("email", email)
        .maybeSingle();
      if (already) continue;
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: `Registrations open — ${fair.name}`,
          react: SubscriberAnnouncementEmail({
            contactName: (lead.full_name as string) || "there",
            fairName: fair.name,
            fairWhen,
            registerUrl,
          }),
        });
        await supabase
          .from("announcement_email_sends")
          .insert({ fair_id: params.fairId, email });
        emailSent += 1;
      } catch (e) {
        console.error("Announcement email failed for", email, e);
      }
    }
  }

  return NextResponse.json({ ok: true, waSent, emailSent });
}
