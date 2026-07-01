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

  // v24 — the door app may send which event this check-in is for.
  // Absent → legacy fair-level check-in.
  let stopId: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body.stopId === "string") stopId = body.stopId;
  } catch {
    /* no body — legacy path */
  }

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
  const now = new Date().toISOString();

  // ---- v24 event-aware check-in ------------------------------------
  // Same QR, scanned at each day's door, records attendance against the
  // supplied event. The legacy fair-level boolean is still flipped on the
  // first-ever check-in so conclude stats / existing UI keep working.
  if (stopId) {
    const { data: stopData } = await supabase
      .from("fair_itinerary")
      .select("id, fair_id, event_type, institution_name, venue_name")
      .eq("id", stopId)
      .maybeSingle();
    const stop = stopData as
      | {
          id: string;
          fair_id: string;
          event_type: string;
          institution_name: string | null;
          venue_name: string | null;
        }
      | null;
    if (!stop || stop.fair_id !== fair?.id) {
      return NextResponse.json(
        { error: "Selected event doesn't belong to this student's fair." },
        { status: 400 }
      );
    }
    const eventName =
      stop.event_type === "OPEN_FAIR"
        ? stop.venue_name || "Open Fair"
        : stop.institution_name || stop.venue_name || "Campus visit";

    const { data: existingRow } = await supabase
      .from("student_event")
      .select("id, checked_in_at")
      .eq("pass_uuid", params.passUuid)
      .eq("itinerary_stop_id", stop.id)
      .maybeSingle();
    const existing = existingRow as
      | { id: string; checked_in_at: string | null }
      | null;

    if (existing?.checked_in_at) {
      return NextResponse.json({
        alreadyCheckedIn: true,
        passNumber: p.pass_number,
        fullName: p.full_name,
        institutionName: p.institution_name,
        fairName: fair?.name,
        eventName,
        checkedInAt: existing.checked_in_at,
      });
    }

    if (existing) {
      const { error: updErr } = await supabase
        .from("student_event")
        .update({ checked_in_at: now })
        .eq("id", existing.id);
      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
    } else {
      // Walk-in: no prior signup row for this event.
      const { error: insErr } = await supabase.from("student_event").insert({
        pass_uuid: params.passUuid,
        itinerary_stop_id: stop.id,
        fair_id: fair?.id ?? null,
        source: "checkin",
        checked_in_at: now,
      });
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }

    // First-ever check-in flips the fair-level flag (conclude stats).
    if (!p.checked_in) {
      await supabase
        .from("fair_student_passes")
        .update({ checked_in: true, checked_in_at: now })
        .eq("pass_uuid", params.passUuid);
    }

    return NextResponse.json({
      alreadyCheckedIn: false,
      passNumber: p.pass_number,
      fullName: p.full_name,
      institutionName: p.institution_name,
      fairName: fair?.name,
      fairStatus: fair?.status,
      eventName,
      checkedInAt: now,
    });
  }

  // ---- Legacy fair-level check-in (no event supplied) --------------
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
