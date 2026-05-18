import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { concludeFairById } from "@/lib/concludeFair";
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

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    istDate: todayISO,
    ongoingChecked: (data as Fair[] | null)?.length ?? 0,
    dueToConclude: due.length,
    results,
  });
}

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}
