import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";

export const runtime = "nodejs";

// `reorder` is a static segment and resolves before the sibling
// dynamic `[stopId]` route, so PATCH /itinerary/reorder lands here.
const reorderSchema = z
  .object({ orderedIds: z.array(z.string().min(1)).min(1) })
  .strict();

export async function PATCH(
  req: Request,
  { params }: { params: { fairId: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("fair_itinerary")
    .select("id")
    .eq("fair_id", params.fairId);

  const valid = new Set((rows ?? []).map((r) => r.id as string));
  const { orderedIds } = parsed.data;
  for (const id of orderedIds) {
    if (!valid.has(id)) {
      return NextResponse.json(
        { error: "Order contains a stop that is not part of this fair." },
        { status: 422 }
      );
    }
  }

  // sort_order and day_number both follow the new order so the landing
  // page, invoice ("Day N") and email stay consistent after a reorder.
  let i = 1;
  for (const id of orderedIds) {
    const { error } = await supabase
      .from("fair_itinerary")
      .update({ sort_order: i, day_number: i })
      .eq("id", id)
      .eq("fair_id", params.fairId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    i++;
  }

  return NextResponse.json({ success: true });
}
