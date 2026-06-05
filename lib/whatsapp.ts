// WhatsApp Cloud API (Meta, direct) transport — the analog of
// lib/resend.ts for the WhatsApp channel.
//
// DARK BY DEFAULT. Every proactive (business-initiated) message must be a
// pre-approved Meta template; freeform text is only allowed inside the
// 24-hour customer-service window opened by a user's own reply. So this
// module only ever sends TEMPLATES. Until WHATSAPP_ENABLED === "true" AND
// the Meta credentials are present, sendTemplate() is a no-op returning
// null — safe to merge and wire into routes before the WABA even exists.
//
// Required env (Netlify) once you go live:
//   WHATSAPP_ENABLED=true
//   WHATSAPP_PHONE_NUMBER_ID   (from the WABA phone number)
//   WHATSAPP_ACCESS_TOKEN      (permanent System-User token, not the 24h one)
//   WHATSAPP_WABA_ID           (informational; not used for sending)
//   WHATSAPP_VERIFY_TOKEN      (webhook handshake — see webhook route)
//   WHATSAPP_APP_SECRET        (webhook signature verification)

const GRAPH_VERSION = "v21.0";

export function isWhatsAppEnabled(): boolean {
  return (
    process.env.WHATSAPP_ENABLED === "true" &&
    !!process.env.WHATSAPP_ACCESS_TOKEN &&
    !!process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  parameters: unknown[];
  sub_type?: string;
  index?: string;
}

export interface SendTemplateArgs {
  /** E.164, with or without a leading "+". */
  to: string;
  /** Meta-approved template name. */
  template: string;
  /** BCP-47 / Meta language code. Defaults to "en". */
  languageCode?: string;
  /** Positional body variables -> {{1}}, {{2}}, ... in template order. */
  bodyParams?: string[];
  /** Full component override (header media, buttons) when bodyParams is insufficient. */
  components?: TemplateComponent[];
}

export interface SendTemplateResult {
  /** WhatsApp message id (wamid...), used to reconcile delivery webhooks. */
  id: string;
}

/**
 * Send a template message via the Cloud API. Returns null (no-op) when
 * the channel is disabled. THROWS on an API error so the caller can log
 * it against the send row — callers use sendWhatsAppTemplate() in
 * lib/whatsappNotify.ts, which wraps this and never throws upward.
 */
export async function sendTemplate(
  args: SendTemplateArgs
): Promise<SendTemplateResult | null> {
  if (!isWhatsAppEnabled()) return null;

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const to = args.to.replace(/^\+/, "");

  const components =
    args.components ??
    (args.bodyParams && args.bodyParams.length > 0
      ? [
          {
            type: "body" as const,
            parameters: args.bodyParams.map((text) => ({
              type: "text",
              text,
            })),
          },
        ]
      : undefined);

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: args.template,
      language: { code: args.languageCode || "en" },
      ...(components ? { components } : {}),
    },
  };

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `WhatsApp send failed (${res.status}): ${detail.slice(0, 500)}`
    );
  }

  const json = (await res.json()) as { messages?: { id: string }[] };
  const id = json.messages?.[0]?.id;
  if (!id) throw new Error("WhatsApp send: no message id in API response");
  return { id };
}
