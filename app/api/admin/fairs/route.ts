import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const createFairSchema = z.object({
  name: z.string().min(2).max(200),
  city: z.string().min(1).max(120).default("Ahmedabad"),
  venue: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  expected_footfall: z.string().max(80).optional().or(z.literal("")),

  fair_date_start: z.iso.date(),
  fair_date_end: z.iso.date(),
  fair_date: z.iso.date().optional(),
  arrive_by: z.iso.date().optional().or(z.literal("")),
  depart_after: z.iso.date().optional().or(z.literal("")),
  registration_deadline: z.iso.date(),
  earlybird_deadline: z.iso.date().optional().or(z.literal("")),

  booth_price_usd: z.number().positive(),
  price_standard_usd: z.number().positive(),
  price_standard_inr: z.number().positive(),
  price_earlybird_usd: z.number().positive().optional().or(z.literal(0)),
  price_earlybird_inr: z.number().positive().optional().or(z.literal(0)),

  max_universities: z.number().int().positive().default(30),
  includes: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
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

  const parsed = createFairSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }
  const input = parsed.data;

  const supabase = createAdminClient();

  const insert = {
    name: input.name,
    city: input.city,
    venue: input.venue,
    description: input.description,
    expected_footfall: input.expected_footfall || null,
    fair_date: input.fair_date || input.fair_date_start,
    fair_date_start: input.fair_date_start,
    fair_date_end: input.fair_date_end,
    arrive_by: input.arrive_by || null,
    depart_after: input.depart_after || null,
    registration_deadline: input.registration_deadline,
    earlybird_deadline: input.earlybird_deadline || null,
    booth_price_usd: input.booth_price_usd,
    price_standard_usd: input.price_standard_usd,
    price_standard_inr: input.price_standard_inr,
    price_earlybird_usd: input.price_earlybird_usd || null,
    price_earlybird_inr: input.price_earlybird_inr || null,
    max_universities: input.max_universities,
    includes: input.includes,
    is_active: false,
    status: "DRAFT" as const,
  };

  const { data: fair, error } = await supabase
    .from("fairs")
    .insert(insert)
    .select("id")
    .single();

  if (error || !fair) {
    return NextResponse.json(
      { error: error?.message || "Could not create fair." },
      { status: 500 }
    );
  }

  await supabase.from("fair_status_log").insert({
    fair_id: fair.id,
    from_status: null,
    to_status: "DRAFT",
    changed_by: admin.email,
    note: "Fair created",
  });

  return NextResponse.json({ fairId: fair.id });
}
