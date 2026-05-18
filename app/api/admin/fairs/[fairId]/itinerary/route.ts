import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// New stops are created lightly (type + sensible defaults). Most fields
// are filled in afterwards via PATCH (auto-save on blur in the builder).
const createSchema = z
  .object({
    event_type: z.enum(["CAMPUS_VISIT", "OPEN_FAIR", "TRAVEL", "FREE"]),
    event_date: z.iso.date().optional(),
    day_number: z.number().int().positive().optional(),
    institution_name: z.string().max(200).optional(),
    venue_name: z.string().max(200).optional(),
    city: z.string().max(120).optional(),
    address: z.string().max(400).optional(),
    start_time: z.string().regex(TIME_RE).optional(),
    end_time: z.string().regex(TIME_RE).optional(),
    is_confirmed: z.boolean().optional(),
    is_public: z.boolean().optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export async function GET(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("fair_itinerary")
    .select("*")
    .eq("fair_id", params.fairId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ stops: data ?? [] });
}

export async function POST(
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

  const parsed = createSchema.safeParse(body);
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
  const { data: fair } = await supabase
    .from("fairs")
    .select("id, fair_date_start, fair_date")
    .eq("id", params.fairId)
    .maybeSingle();
  if (!fair) {
    return NextResponse.json({ error: "Fair not found." }, { status: 404 });
  }

  // Append after the last stop: next sort_order / day_number = max + 1.
  const { data: lastRows } = await supabase
    .from("fair_itinerary")
    .select("day_number, sort_order")
    .eq("fair_id", params.fairId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const last = lastRows?.[0];
  const nextOrder = (last?.sort_order ?? 0) + 1;
  const nextDay = (last?.day_number ?? 0) + 1;

  const d = parsed.data;
  const insert = {
    fair_id: params.fairId,
    event_type: d.event_type,
    event_date:
      d.event_date ??
      fair.fair_date_start ??
      fair.fair_date ??
      new Date().toISOString().slice(0, 10),
    day_number: d.day_number ?? nextDay,
    sort_order: nextOrder,
    institution_name: d.institution_name?.trim() || null,
    venue_name: d.venue_name?.trim() || null,
    city: d.city?.trim() || "",
    address: d.address?.trim() || null,
    start_time: d.start_time || null,
    end_time: d.end_time || null,
    is_main_fair: false,
    is_confirmed: d.is_confirmed ?? false,
    is_public: d.is_public ?? true,
    notes: d.notes?.trim() || null,
  };

  const { data: stop, error } = await supabase
    .from("fair_itinerary")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ stop });
}
