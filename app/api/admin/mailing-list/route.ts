import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";

export const runtime = "nodejs";

/** Global mailing list — same endpoint serves every fair's mailing-list page. */

const recipientSchema = z.object({
  email: z.email("Enter a valid email."),
  name: z.string().max(120).optional().or(z.literal("")),
  organization: z.string().max(200).optional().or(z.literal("")),
  source: z
    .enum(["MANUAL", "CSV_UPLOAD", "PAST_PARTICIPANT", "NEWSLETTER"])
    .default("MANUAL"),
});

const postSchema = z.union([
  recipientSchema,
  z.object({
    recipients: z.array(recipientSchema).min(1),
  }),
]);

export async function GET() {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("announcement_recipients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ recipients: data ?? [] });
}

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

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const list =
    "recipients" in parsed.data ? parsed.data.recipients : [parsed.data];

  const rows = list.map((r) => ({
    email: r.email.toLowerCase().trim(),
    name: r.name || null,
    organization: r.organization || null,
    source: r.source,
    is_active: true,
  }));

  const supabase = createAdminClient();
  // Upsert on email so duplicates don't 23505. Existing rows get
  // re-activated if they were marked unsubscribed.
  const { data, error } = await supabase
    .from("announcement_recipients")
    .upsert(rows, { onConflict: "email", ignoreDuplicates: false })
    .select("id, email");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    inserted: data?.length ?? 0,
    recipients: data ?? [],
  });
}
