import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminder, type ReminderType } from "@/lib/reminderSender";
import type { Fair, FairStatus } from "@/types";

export const runtime = "nodejs";

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (secret && secret === expected) return true;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${expected}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Inclusive on the boundary days. T-N means "send when today is N days
 * before the target date OR less, but not past it". */
function withinDaysBefore(target: string | null | undefined, days: number) {
  if (!target) return false;
  const t = new Date(target).getTime();
  const now = Date.now();
  return now >= t - days * DAY_MS && now < t;
}

/**
 * Daily check: for every fair, fire any reminders whose trigger window
 * is open. Deduped by announcement_sends (broad reminders) so re-running
 * is safe.
 *
 * Triggers:
 *   EARLYBIRD_REMINDER     T-7  before earlybird_deadline
 *   REGISTRATION_REMINDER  T-14 before registration_deadline
 *   ITINERARY              T-28 before fair_date_start
 *   PAYMENT_REMINDER       not auto-fired (always admin-initiated)
 */
async function run(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: fairs } = await supabase
    .from("fairs")
    .select("*")
    .in("status", ["PUBLISHED", "REGISTRATION_CLOSED"] as FairStatus[]);

  const fairList = (fairs as Fair[] | null) || [];
  const log: {
    fairId: string;
    type: ReminderType;
    sent: number;
    skipped: number;
    failed: number;
  }[] = [];

  for (const fair of fairList) {
    const due: ReminderType[] = [];
    if (withinDaysBefore(fair.earlybird_deadline, 7)) {
      due.push("EARLYBIRD_REMINDER");
    }
    if (withinDaysBefore(fair.registration_deadline, 14)) {
      due.push("REGISTRATION_REMINDER");
    }
    if (
      withinDaysBefore(fair.fair_date_start ?? fair.fair_date, 28) &&
      fair.status !== "ONGOING"
    ) {
      due.push("ITINERARY");
    }

    for (const type of due) {
      try {
        const res = await sendReminder({ supabase, fair, type });
        log.push({
          fairId: fair.id,
          type,
          sent: res.sent,
          skipped: res.skipped,
          failed: res.failed,
        });
      } catch (e) {
        console.error("cron send-reminders failed:", fair.id, type, e);
        log.push({ fairId: fair.id, type, sent: 0, skipped: 0, failed: 1 });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    fairsChecked: fairList.length,
    actions: log,
  });
}

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}
