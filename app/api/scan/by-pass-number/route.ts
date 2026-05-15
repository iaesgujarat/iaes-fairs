import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Manual-entry fallback for the rep scanner.
 * GET /api/scan/by-pass-number?number=FAIR-2026-0042 → { passUuid }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const number = url.searchParams.get("number")?.trim().toUpperCase();
  if (!number) {
    return NextResponse.json(
      { error: "Pass number is required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: pass } = await supabase
    .from("fair_student_passes")
    .select("pass_uuid")
    .eq("pass_number", number)
    .maybeSingle();

  if (!pass) {
    return NextResponse.json({ error: "Pass not found." }, { status: 404 });
  }

  return NextResponse.json({ passUuid: pass.pass_uuid });
}
