import { getResend, FROM_EMAIL } from "@/lib/resend";
import { AdminNotificationEmail } from "@/emails/AdminNotificationEmail";

// Destination for internal admin alerts. Defaults to the same address
// the platform sends FROM, so notifications land in the inbox that
// the IAES team already monitors. Override via Netlify env var
// `ADMIN_NOTIFICATION_EMAIL` if you ever want a different mailbox.
export const ADMIN_NOTIFICATION_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL || "educationfair@iaesgujarat.org";

interface Row {
  label: string;
  value: string;
}

interface SendArgs {
  subject: string;
  title: string;
  subtitle: string;
  rows: Row[];
  ctaUrl?: string;
  ctaLabel?: string;
  note?: string;
}

/**
 * Fire-and-forget admin notification. Never throws — Resend or env
 * failures only get logged so a downstream caller (registration
 * route) never breaks the customer-facing flow over an internal alert.
 *
 * Falls through silently if RESEND_API_KEY is unset (mirrors the
 * pattern used for the customer-facing emails). Same fallback if
 * ADMIN_NOTIFICATION_EMAIL is somehow empty.
 */
export async function sendAdminNotification(args: SendArgs): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  if (!ADMIN_NOTIFICATION_EMAIL) return;
  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: args.subject,
      react: AdminNotificationEmail({
        title: args.title,
        subtitle: args.subtitle,
        rows: args.rows,
        ctaUrl: args.ctaUrl,
        ctaLabel: args.ctaLabel,
        note: args.note,
      }),
    });
  } catch (e) {
    console.error("Admin notification email failed:", e);
  }
}
