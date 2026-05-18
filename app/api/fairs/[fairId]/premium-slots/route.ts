import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Public — live premium slot count for the registration PricingCards.
 * Returns counts only (no PII). Degrades safely if the view/columns
 * are not migrated yet (treat as full availability via fair default).
 *
 * GET /api/fairs/[fairId]/premium-slots
 */
export async function GET(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("premium_slot_status")
    .select("premium_slots_total, slots_taken, slots_remaining")
    .eq("fair_id", params.fairId)
    .maybeSingle();

  if (error || !data) {
    // Pre-migration / no row — let the card show "slots available"
    // from the fair default rather than blocking registration.
    return NextResponse.json({
      total: null,
      taken: 0,
      remaining: null,
      isSoldOut: false,
    });
  }

  const remaining = data.slots_remaining ?? 0;
  return NextResponse.json({
    total: data.premium_slots_total,
    taken: data.slots_taken,
    remaining,
    isSoldOut: remaining <= 0,
  });
}
