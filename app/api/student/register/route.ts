import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { StudentPassEmail } from "@/emails/StudentPassEmail";
import { studentPassSchema } from "@/lib/schemas";
import {
  registerWhatsAppContact,
  sendWhatsAppTemplate,
  WA_TEMPLATES,
} from "@/lib/whatsappNotify";
import type { Fair } from "@/types";

export const runtime = "nodejs";

interface StopRow {
  id: string;
  fair_id: string;
  event_type: string;
  institution_name: string | null;
}

/**
 * v24 — record which event(s) a student signed up for. Called after the
 * pass exists (new or returning). Idempotent: a returning student who
 * re-uses the campus link keeps their existing row (and any check-in);
 * we never overwrite checked_in_at. Best-effort at the call site.
 */
async function recordEventSignups(
  supabase: ReturnType<typeof createAdminClient>,
  passUuid: string,
  fairId: string,
  stop: StopRow | null,
  alsoOpenFair: boolean
): Promise<void> {
  const rows: {
    pass_uuid: string;
    itinerary_stop_id: string;
    fair_id: string;
    source: string;
  }[] = [];

  if (stop) {
    rows.push({
      pass_uuid: passUuid,
      itinerary_stop_id: stop.id,
      fair_id: fairId,
      source: stop.event_type === "OPEN_FAIR" ? "open_fair_form" : "campus_form",
    });
  }

  // "Also attend the Open Fair" — skip if the student already signed up
  // via the open-fair link itself.
  if (alsoOpenFair && (!stop || stop.event_type !== "OPEN_FAIR")) {
    const { data: openStop } = await supabase
      .from("fair_itinerary")
      .select("id")
      .eq("fair_id", fairId)
      .eq("event_type", "OPEN_FAIR")
      .eq("is_public", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (openStop) {
      rows.push({
        pass_uuid: passUuid,
        itinerary_stop_id: (openStop as { id: string }).id,
        fair_id: fairId,
        source: "open_fair_checkbox",
      });
    }
  }

  if (rows.length === 0) return;
  await supabase
    .from("student_event")
    .upsert(rows, {
      onConflict: "pass_uuid,itinerary_stop_id",
      ignoreDuplicates: true,
    });
}

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

  // v24 — resolve the event context (campus / open-fair link). The stop
  // must belong to this fair. A campus visit FORCES the student's
  // institution identity to the host institution — no ambiguity, even if
  // the client tampers with the (locked) field.
  let stop: StopRow | null = null;
  if (input.itinerary_stop_id) {
    const { data: stopData } = await supabase
      .from("fair_itinerary")
      .select("id, fair_id, event_type, institution_name")
      .eq("id", input.itinerary_stop_id)
      .maybeSingle();
    if (stopData && (stopData as StopRow).fair_id === input.fair_id) {
      stop = stopData as StopRow;
    }
  }
  const institutionName =
    stop && stop.event_type === "CAMPUS_VISIT" && stop.institution_name
      ? stop.institution_name
      : input.institution_name;

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
    // WhatsApp: keep the registry fresh + resend the pass (dark until
    // WHATSAPP_ENABLED). Students are India-based -> default CC "IN".
    await registerWhatsAppContact(supabase, {
      rawPhone: input.phone,
      defaultCc: "IN",
      name: existing.full_name,
      audience: "student",
      fairId: input.fair_id,
      consent: !!input.whatsapp_consent,
    });
    await sendWhatsAppTemplate(supabase, {
      fairId: input.fair_id,
      rawPhone: input.phone,
      defaultCc: "IN",
      template: WA_TEMPLATES.STUDENT_PASS,
      context: "student_pass",
      bodyParams: [existing.full_name, f.name, formatRange(f)],
      urlButtonParam: existing.pass_uuid,
    });
    // v24 — a returning student re-using the campus link still gets
    // recorded against this event (keeps existing rows / check-ins).
    try {
      await recordEventSignups(
        supabase,
        existing.pass_uuid,
        f.id,
        stop,
        !!input.also_open_fair
      );
    } catch (e) {
      console.error("Event signup (returning pass) failed:", e);
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
      institution_name: institutionName,
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

  // v24 — record the event signup(s) right after the pass exists, before
  // best-effort notifications, so a mail hiccup can't lose the signup.
  try {
    await recordEventSignups(
      supabase,
      pass.pass_uuid,
      f.id,
      stop,
      !!input.also_open_fair
    );
  } catch (e) {
    console.error("Event signup (new pass) failed:", e);
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

  // WhatsApp: register the number for this + future fairs (consented
  // only) and send the pass (dark until WHATSAPP_ENABLED).
  await registerWhatsAppContact(supabase, {
    rawPhone: input.phone,
    defaultCc: "IN",
    name: input.full_name,
    audience: "student",
    fairId: input.fair_id,
    consent: !!input.whatsapp_consent,
  });
  await sendWhatsAppTemplate(supabase, {
    fairId: input.fair_id,
    rawPhone: input.phone,
    defaultCc: "IN",
    template: WA_TEMPLATES.STUDENT_PASS,
    context: "student_pass",
    bodyParams: [input.full_name, f.name, formatRange(f)],
    urlButtonParam: pass.pass_uuid,
  });

  return NextResponse.json({
    passUuid: pass.pass_uuid,
    passNumber: pass.pass_number,
  });
}
