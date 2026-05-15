import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FairStatus } from "@/types";

export const runtime = "nodejs";

/**
 * Auto-close any PUBLISHED fair whose registration_deadline is in the
 * past. Designed to be hit once a day by Netlify Scheduled Functions
 * (or any external cron) using the CRON_SECRET as a bearer.
 *
 * curl-callable: yes, but with the secret in `Authorization: Bearer <secret>`
 * or `?secret=<secret>`.
 */
function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const url = new URL(req.url);
  const secretFromQuery = url.searchParams.get("secret");
  if (secretFromQuery && secretFromQuery === expected) return true;
  const header = req.headers.get("authorization") || "";
  if (header === `Bearer ${expected}`) return true;
  // Netlify Scheduled Functions sign requests with x-nf-event = "schedule";
  // we still require CRON_SECRET so external callers can't trigger it.
  return false;
}

export async function POST(req: Request) {
  return run(req);
}

// Netlify Scheduled Functions invoke via GET. Accept both verbs.
export async function GET(req: Request) {
  return run(req);
}

async function run(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized — provide CRON_SECRET." },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: due, error: dueErr } = await supabase
    .from("fairs")
    .select("id, name, registration_deadline, status")
    .eq("status", "PUBLISHED")
    .lt("registration_deadline", today);

  if (dueErr) {
    return NextResponse.json({ error: dueErr.message }, { status: 500 });
  }

  const fairs =
    (due as
      | { id: string; name: string; registration_deadline: string; status: FairStatus }[]
      | null) || [];

  const closedIds: string[] = [];
  for (const f of fairs) {
    const { error: upErr } = await supabase
      .from("fairs")
      .update({
        status: "REGISTRATION_CLOSED" as FairStatus,
        registration_closed_at: new Date().toISOString(),
      })
      .eq("id", f.id);
    if (upErr) continue;
    await supabase.from("fair_status_log").insert({
      fair_id: f.id,
      from_status: "PUBLISHED",
      to_status: "REGISTRATION_CLOSED",
      changed_by: "system:cron",
      note: `Auto-closed: deadline ${f.registration_deadline} passed.`,
    });
    closedIds.push(f.id);
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    candidates: fairs.length,
    closed: closedIds.length,
    closedIds,
  });
}
