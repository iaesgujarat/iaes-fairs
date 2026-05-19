import { createClient } from "@/lib/supabase/server";
import { fetchPublicItinerary } from "@/lib/itinerary";
import type { Fair } from "@/types";

// All helpers are resilient: they swallow errors and return null/[]
// so the landing page degrades gracefully (between-fairs state) rather
// than crashing on a transient DB hiccup or a pre-migration schema.

// v16 Phase 1 — publicly-visible fair statuses. DRAFT and the
// terminal states (CANCELLED/COMPLETED/ARCHIVED) are excluded here
// so they never reach the landing page or a /fair/[id] detail page.
const PUBLIC_FAIR_STATUSES = [
  "PUBLISHED",
  "REGISTRATION_CLOSED",
  "ONGOING",
] as const;

/**
 * All publicly-visible active fairs (+ each fair's public itinerary),
 * soonest first. Empty array if none. Capped at 3 — running more than
 * three concurrent fairs is an admin-side decision, not a UI concern.
 *
 * Resilient: swallows errors → [] so the landing page degrades to the
 * between-fairs state rather than crashing on a transient DB hiccup.
 */
export async function getActiveFairs(): Promise<Fair[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("fairs")
      .select("*")
      .eq("is_active", true)
      .in("status", PUBLIC_FAIR_STATUSES as unknown as string[])
      .order("fair_date_start", { ascending: true })
      .limit(3);
    if (!data?.length) return [];
    return await Promise.all(
      data.map(async (f) => ({
        ...(f as Fair),
        itinerary: await fetchPublicItinerary(supabase, f.id),
      }))
    );
  } catch {
    return [];
  }
}

/**
 * The currently active fair (+ its public itinerary), or null.
 * Backward-compatible wrapper around getActiveFairs() — kept so every
 * existing caller (only app/page.tsx today) keeps working unchanged.
 */
export async function getActiveFair(): Promise<Fair | null> {
  return (await getActiveFairs())[0] ?? null;
}

/**
 * One fair by id (+ its public itinerary), or null if missing.
 * Used by the v16 /fair/[fairId] detail page. .maybeSingle() so a
 * bad/unknown id returns null (→ notFound()) instead of throwing.
 */
export async function getFairById(id: string): Promise<Fair | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("fairs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const itinerary = await fetchPublicItinerary(supabase, data.id);
    return { ...(data as Fair), itinerary };
  } catch {
    return null;
  }
}

/** Most recently concluded fair (for the between-fairs hero badge). */
export async function getLastConcludedFair(): Promise<Fair | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("fairs")
      .select("*")
      .eq("status", "COMPLETED")
      .order("concluded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as Fair) ?? null;
  } catch {
    return null;
  }
}

/** All completed fairs, newest first (for the "Past Fairs" list). */
export async function getPastFairs(): Promise<Fair[]> {
  try {
    const supabase = createClient();
    // select('*') — never name stat_* columns explicitly; they only
    // exist if a future migration adds them, and the UI hides the
    // stats row gracefully when they're absent.
    const { data } = await supabase
      .from("fairs")
      .select("*")
      .eq("status", "COMPLETED")
      .order("fair_date", { ascending: false });
    return (data as Fair[]) ?? [];
  } catch {
    return [];
  }
}
