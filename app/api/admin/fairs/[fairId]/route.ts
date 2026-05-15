import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import type { FairStatus } from "@/types";

export const runtime = "nodejs";

// Only fields safe to edit post-creation. Status transitions go through
// the dedicated /publish, /start, etc. routes — never via PUT.
const editFairSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    city: z.string().min(1).max(120).optional(),
    venue: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(4000).optional(),
    fair_date: z.iso.date().optional(),
    fair_date_start: z.iso.date().optional(),
    fair_date_end: z.iso.date().optional(),
    arrive_by: z.iso.date().optional().or(z.literal("")),
    depart_after: z.iso.date().optional().or(z.literal("")),
    registration_deadline: z.iso.date().optional(),
    earlybird_deadline: z.iso.date().optional().or(z.literal("")),
    booth_price_usd: z.number().positive().optional(),
    price_standard_usd: z.number().positive().optional(),
    price_standard_inr: z.number().positive().optional(),
    price_earlybird_usd: z.number().positive().optional().or(z.literal(0)),
    price_earlybird_inr: z.number().positive().optional().or(z.literal(0)),
    max_universities: z.number().int().positive().optional(),
    includes: z.array(z.string()).optional(),
  })
  .strict();

export async function PUT(
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

  const parsed = editFairSchema.safeParse(body);
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
    .select("id, status")
    .eq("id", params.fairId)
    .maybeSingle();

  if (!fair) {
    return NextResponse.json({ error: "Fair not found." }, { status: 404 });
  }

  const status = (fair.status as FairStatus | undefined) ?? "DRAFT";
  if (status !== "DRAFT" && status !== "PUBLISHED") {
    return NextResponse.json(
      {
        error: `Fair cannot be edited in status ${status}. Edits are only allowed in DRAFT or PUBLISHED.`,
      },
      { status: 409 }
    );
  }

  // Normalise blank strings to null for nullable dates
  const update: Record<string, unknown> = { ...parsed.data };
  for (const k of [
    "arrive_by",
    "depart_after",
    "earlybird_deadline",
    "price_earlybird_usd",
    "price_earlybird_inr",
  ]) {
    if (update[k] === "" || update[k] === 0) update[k] = null;
  }

  const { error } = await supabase
    .from("fairs")
    .update(update)
    .eq("id", params.fairId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
