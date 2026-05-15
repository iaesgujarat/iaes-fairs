import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { InstitutionConfirmationEmail } from "@/emails/InstitutionConfirmationEmail";
import { institutionRegistrationSchema } from "@/lib/schemas";
import type { Fair } from "@/types";

export const runtime = "nodejs";

function formatRange(fair: Fair): string {
  const start = fair.fair_date_start || fair.fair_date;
  const end = fair.fair_date_end || fair.fair_date;
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  if (!end || end === start) {
    return new Date(start).toLocaleDateString("en-IN", opts);
  }
  return `${new Date(start).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
  })} – ${new Date(end).toLocaleDateString("en-IN", opts)}`;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = institutionRegistrationSchema.safeParse(body);
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
    return NextResponse.json(
      { error: "Fair not found." },
      { status: 404 }
    );
  }
  const f = fair as Fair;

  if (f.status && f.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Registration is no longer open for this fair." },
      { status: 409 }
    );
  }

  const { data: registration, error: regErr } = await supabase
    .from("institution_registrations")
    .insert({
      fair_id: input.fair_id,
      institution_name: input.institution_name,
      institution_type: input.institution_type,
      city: input.city,
      state: input.state,
      website: input.website || null,
      contact_name: input.contact_name,
      designation: input.designation,
      email: input.email,
      phone: input.phone,
      expected_student_count: input.expected_student_count,
      courses: input.courses,
      year_semester: input.year_semester,
      fields_of_interest: input.fields_of_interest,
      budget_range: input.budget_range,
      whatsapp_consent: !!input.whatsapp_consent,
      email_consent: !!input.email_consent,
      data_sharing_consent: !!input.data_sharing_consent,
      status: "registered",
    })
    .select()
    .single();

  if (regErr || !registration) {
    return NextResponse.json(
      { error: regErr?.message || "Could not save registration." },
      { status: 500 }
    );
  }

  // Send confirmation email (non-blocking on failure)
  try {
    if (process.env.RESEND_API_KEY) {
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: input.email,
        subject: `Registration Confirmed — ${f.name}`,
        react: InstitutionConfirmationEmail({
          contactName: input.contact_name,
          institutionName: input.institution_name,
          city: input.city,
          state: input.state,
          expectedStudentCount: input.expected_student_count,
          fairName: f.name,
          fairDateRange: formatRange(f),
          venue: f.venue || f.city,
        }),
      });
    }
  } catch (e) {
    console.error("Institution confirmation email failed:", e);
  }

  return NextResponse.json({ registrationId: registration.id });
}
