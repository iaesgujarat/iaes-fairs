import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Live university-slot status for a fair: { total, taken, remaining }.
 *
 * v16 Phase 1 prepares this route; the grid does NOT render a slot bar
 * yet (Phase 2 uses it). Uses the service-role admin client on purpose:
 * the registrations table is service-role-only under RLS, so an anon
 * SSR client would always count 0 (the idealised spec's bug). Returns
 * aggregate counts only — no PII — so it is safe to expose on GET.
 */
export async function GET(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  try {
    const supabase = createAdminClient();

    const [fairRes, countRes] = await Promise.all([
      supabase
        .from("fairs")
        .select("max_universities")
        .eq("id", params.fairId)
        .maybeSingle(),
      supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("fair_id", params.fairId)
        .neq("status", "cancelled"),
    ]);

    const total = fairRes.data?.max_universities ?? 30;
    const taken = countRes.count ?? 0;
    const remaining = Math.max(0, total - taken);

    return NextResponse.json({ total, taken, remaining });
  } catch {
    return NextResponse.json(
      { error: "Could not load slot status." },
      { status: 500 }
    );
  }
}
