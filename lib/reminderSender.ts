import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { EarlybirdReminderEmail } from "@/emails/EarlybirdReminderEmail";
import { RegistrationReminderEmail } from "@/emails/RegistrationReminderEmail";
import { ItineraryEmail } from "@/emails/ItineraryEmail";
import { PaymentReminderEmail } from "@/emails/PaymentReminderEmail";
import {
  appUrl,
  formatFairDateRange,
  formatDateLong,
  TEST_RECIPIENT,
} from "@/lib/mailerHelpers";
import type {
  Fair,
  AnnouncementRecipient,
  Currency,
  AnnouncementEmailType,
} from "@/types";

export type ReminderType =
  | "EARLYBIRD_REMINDER"
  | "REGISTRATION_REMINDER"
  | "ITINERARY"
  | "PAYMENT_REMINDER";

export interface ReminderResult {
  ok: boolean;
  type: AnnouncementEmailType;
  sent: number;
  skipped: number;
  failed: number;
  failures: { recipient: string; error: string }[];
  testOnly?: boolean;
  /** If preflight failed (e.g. no early-bird configured), reason is set. */
  skippedReason?: string;
}

interface RegRow {
  id: string;
  contact_name: string;
  contact_email: string;
  university_name: string;
  invoice?:
    | {
        invoice_number?: string;
        total_amount_inr?: number | null;
        total_amount_usd?: number | null;
        payment_currency?: Currency;
        due_date?: string | null;
      }
    | {
        invoice_number?: string;
        total_amount_inr?: number | null;
        total_amount_usd?: number | null;
        payment_currency?: Currency;
        due_date?: string | null;
      }[];
}

type Supabase = ReturnType<typeof createAdminClient>;

/**
 * Single entry point used by both the admin "Send Now" UI and the
 * daily cron. Handles dedupe via announcement_sends (for mailing-list
 * types) and just-in-time iteration over registrations (for itinerary
 * + payment reminders, which target specific people).
 */
export async function sendReminder(opts: {
  supabase: Supabase;
  fair: Fair;
  type: ReminderType;
  testOnly?: boolean;
}): Promise<ReminderResult> {
  const { supabase, fair, type, testOnly = false } = opts;

  if (!process.env.RESEND_API_KEY) {
    return {
      ok: false,
      type,
      sent: 0,
      skipped: 0,
      failed: 0,
      failures: [],
      skippedReason: "Resend is not configured.",
    };
  }

  if (type === "EARLYBIRD_REMINDER") {
    if (!fair.earlybird_deadline || !fair.price_earlybird_usd) {
      return {
        ok: true,
        type,
        sent: 0,
        skipped: 0,
        failed: 0,
        failures: [],
        skippedReason: "No early-bird tier configured.",
      };
    }
    return runMailingListReminder({
      supabase,
      fair,
      type,
      testOnly,
      subject: `Early Bird ends soon — ${fair.name}`,
      render: (rec) =>
        EarlybirdReminderEmail({
          recipientName: rec?.name ?? "Colleague",
          fairName: fair.name,
          earlybirdDeadline: formatDateLong(fair.earlybird_deadline),
          earlybirdUSD: Number(fair.price_earlybird_usd || 0),
          standardUSD: Number(
            fair.price_standard_usd ?? fair.booth_price_usd ?? 0
          ),
          registerUrl: `${appUrl()}/register/university`,
        }),
    });
  }

  if (type === "REGISTRATION_REMINDER") {
    if (!fair.registration_deadline) {
      return {
        ok: true,
        type,
        sent: 0,
        skipped: 0,
        failed: 0,
        failures: [],
        skippedReason: "No registration deadline configured.",
      };
    }
    const { count: regsCount } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("fair_id", fair.id)
      .in("status", ["pending", "invoice_sent", "paid", "confirmed"]);
    const max = fair.max_universities ?? null;
    const remaining =
      max != null && regsCount != null ? Math.max(max - regsCount, 0) : null;
    return runMailingListReminder({
      supabase,
      fair,
      type,
      testOnly,
      subject: `Registration closes soon — ${fair.name}`,
      render: (rec) =>
        RegistrationReminderEmail({
          recipientName: rec?.name ?? "Colleague",
          fairName: fair.name,
          registrationDeadline: formatDateLong(fair.registration_deadline),
          spotsRemaining: remaining,
          maxUniversities: max,
          registerUrl: `${appUrl()}/register/university`,
        }),
    });
  }

  return runRegistrationsReminder({ supabase, fair, type, testOnly });
}

// ----------------------------------------------------------------
// Mailing-list reminders (broad audience)
// ----------------------------------------------------------------
async function runMailingListReminder(opts: {
  supabase: Supabase;
  fair: Fair;
  type: AnnouncementEmailType;
  testOnly: boolean;
  subject: string;
  render: (rec: AnnouncementRecipient | null) => React.ReactElement;
}): Promise<ReminderResult> {
  const { supabase, fair, type, testOnly, subject, render } = opts;
  const resend = getResend();

  if (testOnly) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TEST_RECIPIENT,
      subject: `[TEST] ${subject}`,
      react: render(null),
    });
    return {
      ok: true,
      type,
      sent: 1,
      skipped: 0,
      failed: 0,
      failures: [],
      testOnly: true,
    };
  }

  const { data: rs } = await supabase
    .from("announcement_recipients")
    .select("*")
    .eq("is_active", true);
  const recipients = (rs as AnnouncementRecipient[] | null) || [];

  const { data: sentRows } = await supabase
    .from("announcement_sends")
    .select("recipient_id")
    .eq("fair_id", fair.id)
    .eq("email_type", type);
  const already = new Set((sentRows || []).map((r) => r.recipient_id));

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const failures: { recipient: string; error: string }[] = [];

  for (const rec of recipients) {
    if (already.has(rec.id)) {
      skipped += 1;
      continue;
    }
    try {
      const res = await resend.emails.send({
        from: FROM_EMAIL,
        to: rec.email,
        subject,
        react: render(rec),
      });
      const emailId =
        (res as { data?: { id?: string } }).data?.id ?? null;
      await supabase.from("announcement_sends").insert({
        fair_id: fair.id,
        recipient_id: rec.id,
        email_type: type,
        resend_email_id: emailId,
      });
      sent += 1;
    } catch (e) {
      failed += 1;
      failures.push({
        recipient: rec.email,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }
  return {
    ok: true,
    type,
    sent,
    skipped,
    failed,
    failures: failures.slice(0, 20),
  };
}

// ----------------------------------------------------------------
// Targeted reminders (itinerary / payment) — to specific registrations
// ----------------------------------------------------------------
async function runRegistrationsReminder(opts: {
  supabase: Supabase;
  fair: Fair;
  type: "ITINERARY" | "PAYMENT_REMINDER";
  testOnly: boolean;
}): Promise<ReminderResult> {
  const { supabase, fair, type, testOnly } = opts;
  const resend = getResend();

  const statusFilter =
    type === "ITINERARY"
      ? ["confirmed", "paid"]
      : ["pending", "invoice_sent"];

  const { data: regs } = await supabase
    .from("registrations")
    .select(
      `id, contact_name, contact_email, university_name, status,
       invoice:invoices(invoice_number, total_amount_inr, total_amount_usd, payment_currency, due_date)`
    )
    .eq("fair_id", fair.id)
    .in("status", statusFilter);

  const list = (regs as RegRow[] | null) || [];

  const itinerary = [
    {
      date: fair.arrive_by
        ? formatDateLong(fair.arrive_by)
        : formatDateLong(fair.fair_date_start),
      details: "Arrive in Ahmedabad. Briefing at hotel.",
    },
    {
      date: formatDateLong(fair.fair_date_start),
      details: "Institutional visits — exact venues confirmed 1 week prior.",
    },
    ...(fair.fair_date_end && fair.fair_date_end !== fair.fair_date_start
      ? [
          {
            date: formatDateLong(fair.fair_date_end),
            details: "Open Fair at Ahmedabad venue (final day).",
          },
        ]
      : []),
    ...(fair.depart_after
      ? [
          {
            date: formatDateLong(fair.depart_after),
            details: "Depart from Ahmedabad.",
          },
        ]
      : []),
  ];

  function render(reg: RegRow) {
    const inv = Array.isArray(reg.invoice) ? reg.invoice[0] : reg.invoice;
    if (type === "ITINERARY") {
      return ItineraryEmail({
        recipientName: reg.contact_name,
        universityName: reg.university_name,
        invoiceNumber: inv?.invoice_number ?? "—",
        fairName: fair.name,
        fairDateRange: formatFairDateRange(fair),
        venue: fair.venue || fair.city,
        arriveBy: fair.arrive_by ? formatDateLong(fair.arrive_by) : null,
        departAfter: fair.depart_after
          ? formatDateLong(fair.depart_after)
          : null,
        itinerary,
        boardingPoint: "TBC — confirmed 1 week before the fair",
        pickupTime: "8:00 AM sharp",
        shipping: {
          address:
            "IAES, 3rd Floor, 301-302, Sun Square, Navarangpura, Ahmedabad – 380009, Gujarat, India",
          deadline: formatDateLong(fair.fair_date_start),
          labelTemplate: `IAES FAIR — ${reg.university_name}`,
        },
      });
    }
    return PaymentReminderEmail({
      recipientName: reg.contact_name,
      fairName: fair.name,
      invoiceNumber: inv?.invoice_number ?? "—",
      paymentCurrency: (inv?.payment_currency as Currency) || "USD",
      totalUSD: inv?.total_amount_usd ? Number(inv.total_amount_usd) : null,
      totalINR: inv?.total_amount_inr ? Number(inv.total_amount_inr) : null,
      dueDate: inv?.due_date ? formatDateLong(inv.due_date) : null,
      payUrl: `${appUrl()}/payment/${reg.id}`,
    });
  }

  if (testOnly) {
    const sample = list[0];
    if (!sample) {
      return {
        ok: true,
        type,
        sent: 0,
        skipped: 0,
        failed: 0,
        failures: [],
        testOnly: true,
        skippedReason:
          type === "ITINERARY"
            ? "No confirmed registrations to preview against."
            : "No unpaid registrations to preview against.",
      };
    }
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TEST_RECIPIENT,
      subject:
        type === "ITINERARY"
          ? `[TEST] Fair briefing — ${fair.name}`
          : `[TEST] Payment pending — ${fair.name}`,
      react: render(sample),
    });
    return {
      ok: true,
      type,
      sent: 1,
      skipped: 0,
      failed: 0,
      failures: [],
      testOnly: true,
    };
  }

  let sent = 0;
  let failed = 0;
  const failures: { recipient: string; error: string }[] = [];
  for (const reg of list) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: reg.contact_email,
        subject:
          type === "ITINERARY"
            ? `Fair briefing — ${fair.name}`
            : `Payment pending — ${fair.name}`,
        react: render(reg),
      });
      sent += 1;
    } catch (e) {
      failed += 1;
      failures.push({
        recipient: reg.contact_email,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  if (type === "ITINERARY" && sent > 0) {
    await supabase
      .from("fairs")
      .update({ itinerary_sent_at: new Date().toISOString() })
      .eq("id", fair.id);
  }

  return {
    ok: true,
    type,
    sent,
    skipped: 0,
    failed,
    failures: failures.slice(0, 20),
  };
}
