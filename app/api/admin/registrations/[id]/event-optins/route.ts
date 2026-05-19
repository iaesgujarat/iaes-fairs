import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const schema = z
  .object({ stopIds: z.array(z.string()).max(50) })
  .strict();

/**
 * Replace a registration's event opt-ins (admin-editable, any tier).
 * Only ids that are public stops of the registration's fair are kept.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed." },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, fair_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!reg) {
    return NextResponse.json(
      { error: "Registration not found." },
      { status: 404 }
    );
  }

  // Keep only ids that are genuine public stops of this fair.
  const { data: pub } = await supabase
    .from("fair_itinerary")
    .select("id")
    .eq("fair_id", reg.fair_id)
    .eq("is_public", true);
  const valid = new Set((pub ?? []).map((p) => p.id as string));
  const stopIds = Array.from(new Set(parsed.data.stopIds)).filter((id) =>
    valid.has(id)
  );

  // Replace: clear existing, insert the new set.
  const { error: delErr } = await supabase
    .from("registration_event_optin")
    .delete()
    .eq("registration_id", params.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  if (stopIds.length > 0) {
    const { error: insErr } = await supabase
      .from("registration_event_optin")
      .insert(
        stopIds.map((itinerary_stop_id) => ({
          registration_id: params.id,
          itinerary_stop_id,
        }))
      );
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, count: stopIds.length });
}
