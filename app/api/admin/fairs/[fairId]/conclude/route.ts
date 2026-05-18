import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { concludeFairById } from "@/lib/concludeFair";

export const runtime = "nodejs";

/**
 * Manual conclude — emergency override. Same shared logic as the
 * midnight auto-conclude cron (stats cache + status + thank-you blast),
 * but admin-authenticated and tagged MANUAL.
 */
export async function POST(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  try {
    const result = await concludeFairById(
      supabase,
      params.fairId,
      "MANUAL",
      admin.email
    );
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not conclude.";
    const status = message.includes("not found") ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
