import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface Body {
  passUuid?: string;
  universityRegistrationId?: string;
  repNotes?: string;
  interested?: boolean;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.passUuid || !body.universityRegistrationId) {
    return NextResponse.json(
      { error: "passUuid and universityRegistrationId are required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Confirm both ends exist (and grab fair_id from the pass for the scan row)
  const { data: pass } = await supabase
    .from("fair_student_passes")
    .select("pass_uuid, fair_id")
    .eq("pass_uuid", body.passUuid)
    .maybeSingle();
  if (!pass) {
    return NextResponse.json({ error: "Pass not found." }, { status: 404 });
  }

  const { data: reg } = await supabase
    .from("registrations")
    .select("id")
    .eq("id", body.universityRegistrationId)
    .maybeSingle();
  if (!reg) {
    return NextResponse.json(
      { error: "University registration not found." },
      { status: 404 }
    );
  }

  // Already scanned by this university? Update notes/interested only.
  const { data: existing } = await supabase
    .from("fair_scans")
    .select("id")
    .eq("pass_uuid", body.passUuid)
    .eq("university_registration_id", body.universityRegistrationId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("fair_scans")
      .update({
        rep_notes: body.repNotes ?? null,
        interested: !!body.interested,
      })
      .eq("id", existing.id);
    return NextResponse.json({ saved: true, alreadyScanned: true });
  }

  const { error } = await supabase.from("fair_scans").insert({
    pass_uuid: body.passUuid,
    fair_id: pass.fair_id,
    university_registration_id: body.universityRegistrationId,
    rep_notes: body.repNotes ?? null,
    interested: !!body.interested,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true, alreadyScanned: false });
}
