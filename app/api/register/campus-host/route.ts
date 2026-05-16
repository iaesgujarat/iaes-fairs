import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { campusHostRequestSchema } from "@/lib/schemas";
import type { Fair } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = campusHostRequestSchema.safeParse(body);
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

  const { data: fair, error: fairErr } = await supabase
    .from("fairs")
    .select("*")
    .eq("id", input.fair_id)
    .maybeSingle();

  if (fairErr || !fair) {
    return NextResponse.json({ error: "Fair not found." }, { status: 404 });
  }
  const f = fair as Fair;

  if (f.status && f.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Registration is no longer open for this fair." },
      { status: 409 }
    );
  }

  // Admin-gated: the programme must be explicitly activated for this fair.
  // Defense in depth — the public card/route are also gated on this flag.
  if (!f.campus_host_requests_active) {
    return NextResponse.json(
      { error: "Campus host requests are not open for this fair yet." },
      { status: 403 }
    );
  }

  const { data: request, error: reqErr } = await supabase
    .from("campus_host_requests")
    .insert({
      fair_id: input.fair_id,
      official_name: input.official_name,
      official_email: input.official_email,
      official_phone: input.official_phone,
      institution_name: input.institution_name,
      website: input.website || null,
      study_programs: input.study_programs,
      approx_participants: input.approx_participants,
      proposed_datetime: input.proposed_datetime,
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      status: "new",
    })
    .select()
    .single();

  if (reqErr || !request) {
    return NextResponse.json(
      { error: reqErr?.message || "Could not save your request." },
      { status: 500 }
    );
  }

  return NextResponse.json({ requestId: request.id });
}
