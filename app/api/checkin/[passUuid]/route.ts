import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Door check-in. Marks a student pass as `checked_in=true`.
 * Gated by `CHECKIN_PIN` env var — door staff enters the PIN once on
 * /checkin, the page stores it in localStorage and sends it with every
 * scan.
 */
function authorized(req: Request): boolean {
  const expected = process.env.CHECKIN_PIN;
  if (!expected) return false;
  const header = req.headers.get("authorization") || "";
  if (header === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("pin") === expected;
}

export async function POST(
  req: Request,
  { params }: { params: { passUuid: string } }
) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: "Invalid check-in PIN." },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  const { data: pass, error: fetchErr } = await supabase
    .from("fair_student_passes")
    .select(
      `pass_uuid, pass_number, full_name, institution_name,
       checked_in, checked_in_at,
       fair:fairs(id, name, status)`
    )
    .eq("pass_uuid", params.passUuid)
    .maybeSingle();

  if (fetchErr || !pass) {
    return NextResponse.json({ error: "Pass not found." }, { status: 404 });
  }

  type Row = {
    pass_uuid: string;
    pass_number: string;
    full_name: string;
    institution_name: string;
    checked_in: boolean;
    checked_in_at: string | null;
    fair?:
      | { id: string; name: string; status: string | null }
      | { id: string; name: string; status: string | null }[]
      | null;
  };
  const p = pass as Row;
  const fair = Array.isArray(p.fair) ? p.fair[0] : p.fair;

  // Already checked in — return the previous timestamp instead of 409
  if (p.checked_in) {
    return NextResponse.json({
      alreadyCheckedIn: true,
      passNumber: p.pass_number,
      fullName: p.full_name,
      institutionName: p.institution_name,
      fairName: fair?.name,
      checkedInAt: p.checked_in_at,
    });
  }

  // Soft-block if the fair isn't ONGOING (warn but still allow — staff
  // may want to test check-in on day-0)
  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("fair_student_passes")
    .update({ checked_in: true, checked_in_at: now })
    .eq("pass_uuid", params.passUuid);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({
    alreadyCheckedIn: false,
    passNumber: p.pass_number,
    fullName: p.full_name,
    institutionName: p.institution_name,
    fairName: fair?.name,
    fairStatus: fair?.status,
    checkedInAt: now,
  });
}
