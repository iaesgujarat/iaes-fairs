import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// v24 — the door app asks which events it can check students in for. Same
// CHECKIN_PIN gate as the check-in endpoint. Returns the active fair's
// campus-visit + open-fair stops, and suggests the one whose date is today
// (IST) so staff normally don't have to pick.
function authorized(req: Request): boolean {
  const expected = process.env.CHECKIN_PIN;
  if (!expected) return false;
  const header = req.headers.get("authorization") || "";
  if (header === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("pin") === expected;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function istTodayISO(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Invalid check-in PIN." }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: fairData } = await supabase
    .from("fairs")
    .select("id, name, status")
    .in("status", ["ONGOING", "PUBLISHED"])
    .order("fair_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const fair = fairData as { id: string; name: string } | null;
  if (!fair) {
    return NextResponse.json({ fairName: null, events: [], suggestedStopId: null });
  }

  const { data: stopsData } = await supabase
    .from("fair_itinerary")
    .select("id, event_date, event_type, institution_name, venue_name")
    .eq("fair_id", fair.id)
    .in("event_type", ["CAMPUS_VISIT", "OPEN_FAIR"])
    .order("sort_order", { ascending: true });

  const events = (
    (stopsData as
      | {
          id: string;
          event_date: string;
          event_type: string;
          institution_name: string | null;
          venue_name: string | null;
        }[]
      | null) ?? []
  ).map((s) => ({
    id: s.id,
    date: s.event_date,
    type: s.event_type,
    label:
      s.event_type === "OPEN_FAIR"
        ? s.venue_name || "Open Fair"
        : s.institution_name || s.venue_name || "Campus visit",
  }));

  const today = istTodayISO();
  const suggested = events.find((e) => e.date === today) ?? null;

  return NextResponse.json({
    fairName: fair.name,
    events,
    suggestedStopId: suggested?.id ?? null,
  });
}
