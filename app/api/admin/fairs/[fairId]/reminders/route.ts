import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { sendReminder } from "@/lib/reminderSender";
import type { Fair } from "@/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  type: z.enum([
    "EARLYBIRD_REMINDER",
    "REGISTRATION_REMINDER",
    "ITINERARY",
    "PAYMENT_REMINDER",
  ]),
  testOnly: z.boolean().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: { fairId: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* default */
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid type." }, { status: 422 });
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

  const result = await sendReminder({
    supabase,
    fair: fair as Fair,
    type: parsed.data.type,
    testOnly: parsed.data.testOnly,
  });

  return NextResponse.json(result);
}
