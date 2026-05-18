import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { concludeFairById } from "@/lib/concludeFair";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { LogoReminderEmail } from "@/emails/LogoReminderEmail";
import type { Fair, FairStatus } from "@/types";

interface PendingLogoRow {
  id: string;
  contact_name: string;
  contact_email: string;
  university_name: string;
  fair:
    | { name: string; premium_deadline: string | null }
    | { name: string; premium_deadline: string | null }[]
    | null;
}

/**
 * Premium logo chase — fires once, 7+ days after registration, if the
 * logo still isn't in and the premium deadline hasn't passed. Runs
 * daily alongside auto-conclude; best-effort, never blocks it.
 */
async function sendPendingLogoReminders(
  supabase: SupabaseClient
): Promise<{ sent: number; failed: number }> {
  if (!process.env.RESEND_API_KEY) return { sent: 0, failed: 0 };

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("registrations")
    .select(
      `id, contact_name, contact_email, university_name,
       fair:fairs(name, premium_deadline)`
    )
    .eq("pricing_tier", "PREMIUM")
    .eq("backdrop_received", false)
    .is("logo_reminder_sent_at", null)
    .neq("status", "cancelled")
    .lt("created_at", sevenDaysAgo);

  const rows = (data as PendingLogoRow[] | null) ?? [];
  if (rows.length === 0) return { sent: 0, failed: 0 };

  const resend = getResend();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let sent = 0;
  let failed = 0;

  for (const r of rows) {
    const fair = Array.isArray(r.fair) ? r.fair[0] : r.fair;
    if (fair?.premium_deadline) {
      const dl = new Date(fair.premium_deadline);
      dl.setHours(0, 0, 0, 0);
      if (today.getTime() > dl.getTime()) continue; // deadline passed
    }
    if (!r.contact_email) continue;
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: r.contact_email,
        subject: `⏰ Logo Still Pending — ${
          fair?.name ?? "IAES Fair"
        } | ${r.university_name}`,
        react: LogoReminderEmail({
          contactName: r.contact_name,
          universityName: r.university_name,
          fairName: fair?.name ?? "IAES Fair",
          premiumDeadline: fair?.premium_deadline ?? null,
        }),
      });
      await supabase
        .from("registrations")
        .update({ logo_reminder_sent_at: new Date().toISOString() })
        .eq("id", r.id);
      sent++;
    } catch (e) {
      failed++;
      console.error(
        `[logo-reminder] failed for ${r.contact_email}:`,
        e
      );
    }
  }
  return { sent, failed };
}

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

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Today's calendar date in IST as YYYY-MM-DD. The scheduled function
 * fires at 18:30 UTC = 00:00 IST, so this is the day *after* a fair
 * that ended yesterday IST — exactly when we want to conclude it. */
function istTodayISO(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Conclude every ONGOING fair whose end date is strictly before today
 * (IST). Strict `<`: a fair ending 8 Aug is concluded by the 9 Aug
 * 00:00 IST run, never by the 8 Aug run. Idempotent — concludeFairById
 * throws "already concluded" which we treat as a skip.
 */
async function run(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const todayISO = istTodayISO();

  const { data, error } = await supabase
    .from("fairs")
    .select("*")
    .eq("status", "ONGOING" as FairStatus);

  if (error) {
    console.error("[auto-conclude] error fetching fairs:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const due = ((data as Fair[] | null) ?? []).filter((f) => {
    const end = f.fair_date_end || f.fair_date;
    return !!end && end < todayISO;
  });

  const results: {
    fairId: string;
    fairName?: string;
    concluded: boolean;
    note?: string;
  }[] = [];

  for (const fair of due) {
    try {
      const r = await concludeFairById(
        supabase,
        fair.id,
        "AUTO",
        "system@auto-conclude"
      );
      results.push({
        fairId: fair.id,
        fairName: r.fairName,
        concluded: true,
        note: `${r.stat_universities_participated} universities, ${r.stat_students_attended} students`,
      });
    } catch (e) {
      const note = e instanceof Error ? e.message : "conclude failed";
      console.error("[auto-conclude] failed for", fair.id, note);
      results.push({ fairId: fair.id, concluded: false, note });
    }
  }

  // Premium logo chase — best-effort, never blocks auto-conclude.
  let logoReminders = { sent: 0, failed: 0 };
  try {
    logoReminders = await sendPendingLogoReminders(supabase);
  } catch (e) {
    console.error("[logo-reminder] batch failed:", e);
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    istDate: todayISO,
    ongoingChecked: (data as Fair[] | null)?.length ?? 0,
    dueToConclude: due.length,
    results,
    logoReminders,
  });
}

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}
