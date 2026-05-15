import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { StudentPassEmail } from "@/emails/StudentPassEmail";
import { studentPassSchema } from "@/lib/schemas";
import type { Fair } from "@/types";

export const runtime = "nodejs";

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://fairs.iaesgujarat.org"
  );
}

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

async function sendPassEmail(opts: {
  toEmail: string;
  fullName: string;
  institutionName: string;
  passNumber: string;
  passUuid: string;
  fair: Fair;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const scanUrl = `${appUrl()}/scan/${opts.passUuid}`;
  const qrDataUrl = await QRCode.toDataURL(scanUrl, {
    width: 200,
    margin: 2,
    color: { dark: "#0B2B5C", light: "#FFFFFF" },
  });
  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: opts.toEmail,
    subject: `Your Fair Pass — ${opts.fair.name}`,
    react: StudentPassEmail({
      fullName: opts.fullName,
      institutionName: opts.institutionName,
      passNumber: opts.passNumber,
      passUrl: `${appUrl()}/pass/${opts.passUuid}`,
      qrDataUrl,
      fairName: opts.fair.name,
      fairDateRange: formatRange(opts.fair),
      venue: opts.fair.venue || opts.fair.city,
    }),
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = studentPassSchema.safeParse(body);
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

  if (f.status && f.status !== "PUBLISHED" && f.status !== "ONGOING") {
    return NextResponse.json(
      { error: "Pass registration is not currently open." },
      { status: 409 }
    );
  }

  // Duplicate (email, fair) → resend the existing pass, don't create a new one
  const { data: existing } = await supabase
    .from("fair_student_passes")
    .select("pass_uuid, pass_number, full_name, institution_name")
    .eq("fair_id", input.fair_id)
    .eq("email", input.email.toLowerCase())
    .maybeSingle();

  if (existing) {
    try {
      await sendPassEmail({
        toEmail: input.email,
        fullName: existing.full_name,
        institutionName: existing.institution_name,
        passNumber: existing.pass_number,
        passUuid: existing.pass_uuid,
        fair: f,
      });
    } catch (e) {
      console.error("Resend pass email failed:", e);
    }
    return NextResponse.json({
      alreadyRegistered: true,
      passUuid: existing.pass_uuid,
      passNumber: existing.pass_number,
    });
  }

  const { data: pass, error: insErr } = await supabase
    .from("fair_student_passes")
    .insert({
      fair_id: input.fair_id,
      full_name: input.full_name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      institution_name: input.institution_name,
      current_course: input.current_course,
      current_semester: input.current_semester,
      english_exam: input.english_exam || null,
      field_of_interest: input.field_of_interest,
      budget_range: input.budget_range || null,
      preferred_countries: input.preferred_countries || [],
      whatsapp_consent: !!input.whatsapp_consent,
      email_consent: !!input.email_consent,
      data_sharing_consent: !!input.data_sharing_consent,
    })
    .select("pass_uuid, pass_number")
    .single();

  if (insErr || !pass) {
    return NextResponse.json(
      { error: insErr?.message || "Could not create pass." },
      { status: 500 }
    );
  }

  try {
    await sendPassEmail({
      toEmail: input.email,
      fullName: input.full_name,
      institutionName: input.institution_name,
      passNumber: pass.pass_number,
      passUuid: pass.pass_uuid,
      fair: f,
    });
  } catch (e) {
    console.error("Student pass email failed:", e);
  }

  return NextResponse.json({
    passUuid: pass.pass_uuid,
    passNumber: pass.pass_number,
  });
}
