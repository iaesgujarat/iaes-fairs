// WhatsApp notification layer — the analog of lib/adminNotify.ts.
//
// Two responsibilities, both FIRE-AND-FORGET (never throw upward; a
// WhatsApp hiccup must never break a registration or its email):
//
//   1. registerWhatsAppContact() — write a consented number into the
//      PERSISTENT cross-fair registry (whatsapp_contacts). This is what
//      makes "register once, hear about every future fair" work: each
//      registration touches the registry, and future broadcasts read it.
//
//   2. sendWhatsAppTemplate() — send a templated message AND log it to
//      whatsapp_sends (audit + delivery reconciliation). No-op while the
//      channel is dark, and a no-op for any number we can't resolve to
//      E.164 — so it's safe to call from every route today.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTemplate, isWhatsAppEnabled, type TemplateComponent } from "@/lib/whatsapp";
import { toE164 } from "@/lib/phoneE164";

export type WhatsAppAudience =
  | "university"
  | "institution"
  | "student"
  | "admin";

// Meta-approved template names. Keep these aligned with what you submit
// in WhatsApp Manager — the string here MUST equal the approved template
// name exactly, or the send 422s (caught + logged as 'failed').
export const WA_TEMPLATES = {
  STUDENT_PASS: "student_pass",
  INSTITUTION_CONFIRMATION: "institution_confirmation",
  UNIVERSITY_REGISTERED: "university_registered",
  SPOT_RESERVED: "spot_reserved",
} as const;

/**
 * Upsert a consented number into the persistent registry. Skips numbers
 * without consent or that can't be normalized. Never resurrects an
 * unsubscribed contact (is_active / unsubscribed_at are left untouched on
 * an existing row). Never throws.
 */
export async function registerWhatsAppContact(
  supabase: SupabaseClient,
  args: {
    rawPhone: string | null | undefined;
    /** Country hint for bare national numbers, e.g. "IN". Omit for intl. */
    defaultCc?: string;
    name?: string | null;
    audience: WhatsAppAudience;
    country?: string | null;
    fairId?: string | null;
    consent: boolean;
  }
): Promise<void> {
  try {
    if (!args.consent) return; // only consented numbers enter the registry
    const phone = toE164(args.rawPhone, args.defaultCc);
    if (!phone) return;

    const { data: existing } = await supabase
      .from("whatsapp_contacts")
      .select("id")
      .eq("phone_e164", phone)
      .maybeSingle();

    if (existing) {
      // Touch last_seen + refresh name; deliberately do NOT touch
      // is_active/unsubscribed_at so a prior STOP stays honoured.
      await supabase
        .from("whatsapp_contacts")
        .update({
          last_seen_at: new Date().toISOString(),
          ...(args.name ? { name: args.name } : {}),
        })
        .eq("id", existing.id);
      return;
    }

    await supabase.from("whatsapp_contacts").insert({
      phone_e164: phone,
      name: args.name ?? null,
      audience: args.audience,
      country: args.country ?? null,
      source_fair_id: args.fairId ?? null,
      consent: true,
    });
  } catch (e) {
    // Unique-violation races (two concurrent inserts of the same number)
    // land here and are harmless — the row already exists.
    console.error("WhatsApp contact registry upsert failed:", e);
  }
}

/**
 * Send a template and log the attempt to whatsapp_sends. No-op when the
 * channel is dark or the number can't be resolved. Never throws — a
 * failure is recorded on the send row, not propagated to the caller.
 *
 * Transactional sends are intentionally NOT deduped here (a student who
 * re-requests their pass should get it again). Broadcast dedupe is the
 * caller's job — see alreadySentWhatsApp().
 */
export async function sendWhatsAppTemplate(
  supabase: SupabaseClient,
  args: {
    fairId: string | null;
    rawPhone: string | null | undefined;
    defaultCc?: string;
    template: string;
    context: string;
    bodyParams?: string[];
    /** Suffix value for a dynamic URL button (see SendTemplateArgs.urlButtonParam). */
    urlButtonParam?: string;
    components?: TemplateComponent[];
  }
): Promise<void> {
  if (!isWhatsAppEnabled()) return; // dark — no log noise either
  const to = toE164(args.rawPhone, args.defaultCc);
  if (!to) return; // unresolvable number — email path already covered it

  let logId: string | null = null;
  try {
    const { data: logRow } = await supabase
      .from("whatsapp_sends")
      .insert({
        fair_id: args.fairId,
        recipient_phone: to,
        template_name: args.template,
        context: args.context,
        status: "queued",
      })
      .select("id")
      .single();
    logId = logRow?.id ?? null;
  } catch (e) {
    console.error("WhatsApp send-log insert failed:", e);
  }

  try {
    const result = await sendTemplate({
      to,
      template: args.template,
      bodyParams: args.bodyParams,
      urlButtonParam: args.urlButtonParam,
      components: args.components,
    });
    if (logId) {
      await supabase
        .from("whatsapp_sends")
        .update({ status: "sent", wa_message_id: result?.id ?? null })
        .eq("id", logId);
    }
  } catch (e) {
    console.error("WhatsApp send failed:", args.context, e);
    if (logId) {
      await supabase
        .from("whatsapp_sends")
        .update({ status: "failed", error: String(e).slice(0, 500) })
        .eq("id", logId);
    }
  }
}

/**
 * Broadcast idempotency helper (for future reminder/announcement fan-out):
 * has this (fair, number, template) already been sent successfully? Lets a
 * cron re-run safely, mirroring the announcement_sends select-before-send
 * pattern. Returns false on any error (fail-open => may re-send, which is
 * safer than silently dropping a broadcast).
 */
export async function alreadySentWhatsApp(
  supabase: SupabaseClient,
  fairId: string,
  phoneE164: string,
  template: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("whatsapp_sends")
      .select("id")
      .eq("fair_id", fairId)
      .eq("recipient_phone", phoneE164)
      .eq("template_name", template)
      .in("status", ["queued", "sent", "delivered", "read"])
      .limit(1);
    return !!(data && data.length > 0);
  } catch {
    return false;
  }
}
