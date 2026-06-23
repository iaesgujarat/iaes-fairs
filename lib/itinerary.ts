import type { SupabaseClient } from "@supabase/supabase-js";
import type { FairItineraryStop, ItineraryEventType } from "@/types";

export const ITINERARY_EVENT_LABELS: Record<ItineraryEventType, string> = {
  CAMPUS_VISIT: "Campus Fair",
  OPEN_FAIR: "Open Fair",
  TRAVEL: "Travel Day",
  FREE: "Free Day",
};

/** "10:00" -> "10:00 AM". Empty string for null/invalid. */
export function formatItineraryTime(
  time: string | null | undefined
): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return "";
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m ?? "00"} ${ampm}`;
}

/** "10:00 AM–1:00 PM" (or just the start, or "") */
export function itineraryTimeRange(stop: {
  start_time: string | null;
  end_time: string | null;
}): string {
  const start = formatItineraryTime(stop.start_time);
  if (!start) return "";
  const end = formatItineraryTime(stop.end_time);
  return end ? `${start}–${end}` : start;
}

/**
 * Canonical itinerary order: chronological by date, then start time
 * (untimed stops sort after timed ones on the same day), then sort_order
 * as a stable tiebreaker for stops that share an exact date + start time.
 *
 * This is the single source of truth for itinerary ordering — adding a
 * stop never pushes others out of sequence, and same-day stops (e.g. a
 * morning campus fair + an evening open fair) line up by time on their own.
 */
export function compareStopsChronological(
  a: { event_date: string; start_time: string | null; sort_order: number },
  b: { event_date: string; start_time: string | null; sort_order: number }
): number {
  if (a.event_date !== b.event_date) {
    return a.event_date < b.event_date ? -1 : 1;
  }
  // Null/empty start_time sorts last within the day.
  const at = a.start_time || "~";
  const bt = b.start_time || "~";
  if (at !== bt) return at < bt ? -1 : 1;
  return a.sort_order - b.sort_order;
}

/** Sort a copy of `stops` into canonical chronological order. */
export function sortStopsChronological<
  T extends { event_date: string; start_time: string | null; sort_order: number }
>(stops: T[]): T[] {
  return [...stops].sort(compareStopsChronological);
}

/**
 * Public itinerary stops for a fair, in canonical chronological order
 * (see compareStopsChronological). Safe: returns
 * [] if the table doesn't exist yet (pre-migration) or on any error —
 * never throws, so callers can render an empty/fallback state.
 *
 * Works with either the anon SSR client (RLS limits it to is_public=true
 * via the "fair_itinerary: anon read public" policy) or the service-role
 * admin client (bypasses RLS; the explicit is_public filter still applies).
 */
export async function fetchPublicItinerary(
  supabase: SupabaseClient,
  fairId: string
): Promise<FairItineraryStop[]> {
  try {
    const { data, error } = await supabase
      .from("fair_itinerary")
      .select("*")
      .eq("fair_id", fairId)
      .eq("is_public", true)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true });
    if (error) return [];
    return (data as FairItineraryStop[]) ?? [];
  } catch {
    return [];
  }
}
