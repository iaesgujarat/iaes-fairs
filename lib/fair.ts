import { createClient } from "@/lib/supabase/server";
import { fetchPublicItinerary } from "@/lib/itinerary";
import type { Fair } from "@/types";

// All helpers are resilient: they swallow errors and return null/[]
// so the landing page degrades gracefully (between-fairs state) rather
// than crashing on a transient DB hiccup or a pre-migration schema.

/** The currently active fair (+ its public itinerary), or null. */
export async function getActiveFair(): Promise<Fair | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("fairs")
      .select("*")
      .eq("is_active", true)
      .order("fair_date", { ascending: false })
      .limit(1)
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
