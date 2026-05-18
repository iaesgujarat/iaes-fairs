import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Count of contacts a booth has saved so far. Powers the live
 * "N contacts saved" badge on /scan. Keyed by the registration_id the
 * device already holds in localStorage — same secret-URL trust model
 * as the rest of the scan flow; only returns a number. Degrades to 0
 * on any error so the scanner UI never breaks.
 *
 * GET /api/scan/count?reg=<registration_id>
 */
export async function GET(req: Request) {
  const reg = new URL(req.url).searchParams.get("reg")?.trim();
  if (!reg) {
    return NextResponse.json(
      { error: "Pass ?reg=<registration_id>" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("fair_scans")
    .select("*", { count: "exact", head: true })
    .eq("university_registration_id", reg);

  if (error) return NextResponse.json({ count: 0 });
  return NextResponse.json({ count: count ?? 0 });
}
