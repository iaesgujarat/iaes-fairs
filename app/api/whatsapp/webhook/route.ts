import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Meta WhatsApp webhook.
//
//   GET  — the one-time verification handshake Meta performs when you
//          register the callback URL (echoes hub.challenge).
//   POST — delivery/read/failed status callbacks AND inbound user
//          messages. We persist everything to whatsapp_inbound, reconcile
//          delivery status onto whatsapp_sends, and honour STOP keywords
//          by deactivating the contact in the registry.
//
// Set in Netlify: WHATSAPP_VERIFY_TOKEN (handshake), WHATSAPP_APP_SECRET
// (payload signature). The route always 200s on POST so Meta doesn't
// retry-storm on a transient processing error.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (
    mode === "subscribe" &&
    token &&
    process.env.WHATSAPP_VERIFY_TOKEN &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

function verifySignature(raw: string, signature: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  // No secret configured (e.g. local dev) -> skip. ALWAYS set in prod.
  if (!secret) return true;
  if (!signature) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

// Minimal shapes for the slices of Meta's webhook payload we read.
interface WAStatus {
  id?: string;
  recipient_id?: string;
  status?: string;
}
interface WAMessage {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
}
interface WAWebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: { statuses?: WAStatus[]; messages?: WAMessage[] };
    }>;
  }>;
}

const STOP_KEYWORDS = new Set([
  "stop",
  "unsubscribe",
  "opt out",
  "optout",
  "cancel",
]);

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body: WAWebhookBody;
  try {
    body = JSON.parse(raw) as WAWebhookBody;
  } catch {
    return NextResponse.json({ ok: true }); // ack malformed; don't retry-storm
  }

  const supabase = createAdminClient();
  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};

        // ---- Delivery / read / failed status callbacks ----
        for (const status of value.statuses ?? []) {
          await supabase.from("whatsapp_inbound").insert({
            wa_message_id: status.id ?? null,
            from_phone: status.recipient_id ?? null,
            kind: "status",
            status: status.status ?? null,
            raw: status,
          });
          if (status.id && status.status) {
            await supabase
              .from("whatsapp_sends")
              .update({ status: status.status })
              .eq("wa_message_id", status.id);
          }
        }

        // ---- Inbound user messages (opens a 24h service window) ----
        for (const message of value.messages ?? []) {
          const text: string = (
            message.text?.body ??
            message.button?.text ??
            ""
          ).trim();

          await supabase.from("whatsapp_inbound").insert({
            wa_message_id: message.id ?? null,
            from_phone: message.from ?? null,
            kind: "message",
            body: text || message.type || null,
            raw: message,
          });

          if (message.from && STOP_KEYWORDS.has(text.toLowerCase())) {
            const phone = "+" + String(message.from).replace(/^\+/, "");
            await supabase
              .from("whatsapp_contacts")
              .update({
                is_active: false,
                unsubscribed_at: new Date().toISOString(),
              })
              .eq("phone_e164", phone);
          }
        }
      }
    }
  } catch (e) {
    console.error("WhatsApp webhook processing error:", e);
  }

  return NextResponse.json({ ok: true });
}
