import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Public — live shared add-on table pool for the BoothConfigurator
 * (Standard / Early-Bird only). Counts only. Degrades safely
 * pre-migration (pool not exhausted → stepper still works).
 *
 * GET /api/fairs/[fairId]/addon-table-status
 */
export async function GET(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("addon_table_status")
    .select("addon_tables_pool, tables_taken, tables_remaining")
    .eq("fair_id", params.fairId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({
      pool: null,
      taken: 0,
      remaining: null,
      isPoolExhausted: false,
    });
  }

  const remaining = data.tables_remaining ?? 0;
  return NextResponse.json({
    pool: data.addon_tables_pool,
    taken: data.tables_taken,
    remaining,
    isPoolExhausted: remaining <= 0,
  });
}
