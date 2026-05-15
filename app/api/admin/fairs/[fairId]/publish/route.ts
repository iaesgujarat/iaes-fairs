import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { runTransition } from "@/lib/fairTransitions";

export const runtime = "nodejs";

const REQUIRED_FIELDS = [
  "name",
  "venue",
  "fair_date_start",
  "fair_date_end",
  "registration_deadline",
  "price_standard_usd",
  "price_standard_inr",
] as const;

export async function POST(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: fair } = await supabase
    .from("fairs")
    .select("*")
    .eq("id", params.fairId)
    .maybeSingle();
  if (!fair) {
    return NextResponse.json({ error: "Fair not found." }, { status: 404 });
  }

  const missing = REQUIRED_FIELDS.filter(
    (f) => fair[f] === null || fair[f] === undefined || fair[f] === ""
  );
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Cannot publish: missing required fields: ${missing.join(", ")}`,
      },
      { status: 422 }
    );
  }

  return runTransition({
    fairId: params.fairId,
    toStatus: "PUBLISHED",
    patch: { is_active: true },
    note: "Fair published — registrations open.",
  });
}
