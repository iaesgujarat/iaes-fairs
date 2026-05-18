import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Every field optional — the builder PATCHes one field at a time on blur,
// and toggles send a single boolean. Nullable text fields accept null (or
// "" which is normalised to null) to clear them.
const patchSchema = z
  .object({
    day_number: z.number().int().positive().optional(),
    event_date: z.iso.date().optional(),
    event_type: z
      .enum(["CAMPUS_VISIT", "OPEN_FAIR", "TRAVEL", "FREE"])
      .optional(),
    institution_name: z.string().max(200).nullable().optional(),
    venue_name: z.string().max(200).nullable().optional(),
    city: z.string().max(120).optional(),
    address: z.string().max(400).nullable().optional(),
    start_time: z
      .string()
      .regex(TIME_RE)
      .or(z.literal(""))
      .nullable()
      .optional(),
    end_time: z
      .string()
      .regex(TIME_RE)
      .or(z.literal(""))
      .nullable()
      .optional(),
    is_main_fair: z.boolean().optional(),
    is_confirmed: z.boolean().optional(),
    is_public: z.boolean().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .strict();

const NULLABLE_TEXT = [
  "institution_name",
  "venue_name",
  "address",
  "notes",
  "start_time",
  "end_time",
] as const;

export async function PATCH(
  req: Request,
  { params }: { params: { fairId: string; stopId: string } }
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

  const parsed = patchSchema.safeParse(body);
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
  const { data: existing } = await supabase
    .from("fair_itinerary")
    .select("id")
    .eq("id", params.stopId)
    .eq("fair_id", params.fairId)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json(
      { error: "Itinerary stop not found." },
      { status: 404 }
    );
  }

  const { is_main_fair, ...rest } = parsed.data;
  const update: Record<string, unknown> = { ...rest };
  for (const k of NULLABLE_TEXT) {
    if (update[k] === "") update[k] = null;
  }

  // Single main-fair invariant: setting true must go through the SQL
  // function (clears all others atomically). Clearing is a plain update.
  if (is_main_fair === true) {
    const { error: rpcErr } = await supabase.rpc("set_main_fair_stop", {
      p_fair_id: params.fairId,
      p_stop_id: params.stopId,
    });
    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    }
  } else if (is_main_fair === false) {
    update.is_main_fair = false;
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from("fair_itinerary")
      .update(update)
      .eq("id", params.stopId)
      .eq("fair_id", params.fairId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data: stop } = await supabase
    .from("fair_itinerary")
    .select("*")
    .eq("id", params.stopId)
    .single();
  return NextResponse.json({ stop });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { fairId: string; stopId: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("fair_itinerary")
    .delete()
    .eq("id", params.stopId)
    .eq("fair_id", params.fairId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
