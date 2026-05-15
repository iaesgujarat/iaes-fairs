import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Fetch a student's profile for the scanning rep. Consent-gated:
 *   - If `data_sharing_consent` is false, return a flagged response
 *     (no profile data) so the rep UI can show a "not shared" message.
 *   - If `data_sharing_consent` is true, return the profile but only
 *     include phone if `whatsapp_consent`, email if `email_consent`.
 */
export async function GET(
  _req: Request,
  { params }: { params: { passUuid: string } }
) {
  const supabase = createAdminClient();
  const { data: pass, error } = await supabase
    .from("fair_student_passes")
    .select(
      `id, pass_uuid, pass_number, full_name, institution_name,
       current_course, current_semester, english_exam,
       field_of_interest, budget_range, preferred_countries,
       whatsapp_consent, email_consent, data_sharing_consent,
       phone, email, checked_in, created_at,
       fair:fairs(name, fair_date_start, fair_date_end, city)`
    )
    .eq("pass_uuid", params.passUuid)
    .maybeSingle();

  if (error || !pass) {
    return NextResponse.json({ error: "Pass not found." }, { status: 404 });
  }

  if (!pass.data_sharing_consent) {
    return NextResponse.json({
      pass_uuid: pass.pass_uuid,
      pass_number: pass.pass_number,
      full_name: pass.full_name,
      institution_name: pass.institution_name,
      sharing: false as const,
    });
  }

  return NextResponse.json({
    sharing: true as const,
    pass_uuid: pass.pass_uuid,
    pass_number: pass.pass_number,
    full_name: pass.full_name,
    institution_name: pass.institution_name,
    current_course: pass.current_course,
    current_semester: pass.current_semester,
    english_exam: pass.english_exam,
    field_of_interest: pass.field_of_interest,
    budget_range: pass.budget_range,
    preferred_countries: pass.preferred_countries,
    phone: pass.whatsapp_consent ? pass.phone : null,
    email: pass.email_consent ? pass.email : null,
    checked_in: pass.checked_in,
    created_at: pass.created_at,
    fair: pass.fair,
  });
}
