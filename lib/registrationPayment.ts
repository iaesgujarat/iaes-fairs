import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Strict "paid in full" gate for leads access. A registration's
 * `confirmed` status is NOT proof of payment on its own — an admin can
 * set it manually — so anything that releases a fair deliverable (the
 * student-leads CSV / portal) checks for a genuinely successful payment
 * row instead. Fails closed: any query error → not paid.
 */
export async function hasSuccessfulPayment(
  supabase: SupabaseClient,
  registrationId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("payments")
    .select("id")
    .eq("registration_id", registrationId)
    .eq("payment_status", "success")
    .limit(1);
  return !error && !!data && data.length > 0;
}
