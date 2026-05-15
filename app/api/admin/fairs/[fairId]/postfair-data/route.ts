import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { PostfairDataEmail } from "@/emails/PostfairDataEmail";
import {
  appUrl,
  formatFairDateRange,
  formatDateLong,
} from "@/lib/mailerHelpers";
import type { Fair, FairStudentPass, FairScan } from "@/types";

export const runtime = "nodejs";

interface ScanRow extends Pick<
  FairScan,
  "pass_uuid" | "rep_notes" | "interested" | "scanned_at"
> {
  pass:
    | (Pick<
        FairStudentPass,
        | "pass_number"
        | "full_name"
        | "institution_name"
        | "current_course"
        | "current_semester"
        | "english_exam"
        | "budget_range"
        | "data_sharing_consent"
        | "whatsapp_consent"
        | "email_consent"
        | "phone"
        | "email"
      > & { field_of_interest: string[]; preferred_countries: string[] })
    | null
    | (Pick<
        FairStudentPass,
        | "pass_number"
        | "full_name"
        | "institution_name"
        | "current_course"
        | "current_semester"
        | "english_exam"
        | "budget_range"
        | "data_sharing_consent"
        | "whatsapp_consent"
        | "email_consent"
        | "phone"
        | "email"
      > & { field_of_interest: string[]; preferred_countries: string[] })[];
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n"))
    return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function buildCsvForScans(scans: ScanRow[]): string {
  const header = [
    "pass_number",
    "full_name",
    "institution",
    "course",
    "semester",
    "field_of_interest",
    "budget_range",
    "preferred_countries",
    "english_exam",
    "email",
    "phone",
    "rep_notes",
    "interested",
    "scanned_at",
  ];
  const lines = [header.join(",")];
  for (const s of scans) {
    const p = Array.isArray(s.pass) ? s.pass[0] : s.pass;
    if (!p || !p.data_sharing_consent) continue;
    lines.push(
      [
        p.pass_number,
        p.full_name,
        p.institution_name,
        p.current_course,
        p.current_semester,
        (p.field_of_interest || []).join("; "),
        p.budget_range,
        (p.preferred_countries || []).join("; "),
        p.english_exam,
        p.email_consent ? p.email : "",
        p.whatsapp_consent ? p.phone : "",
        s.rep_notes,
        s.interested ? "yes" : "no",
        s.scanned_at,
      ]
        .map(escapeCsv)
        .join(",")
    );
  }
  return lines.join("\n");
}

export async function POST(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Resend is not configured." },
      { status: 503 }
    );
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
  const f = fair as Fair;

  if (f.status !== "COMPLETED" && f.status !== "ARCHIVED") {
    return NextResponse.json(
      {
        error:
          "Post-fair data can only be sent after the fair is concluded.",
      },
      { status: 409 }
    );
  }

  // Load all confirmed/paid university registrations
  const { data: regs } = await supabase
    .from("registrations")
    .select("id, contact_name, contact_email, university_name")
    .eq("fair_id", f.id)
    .in("status", ["confirmed", "paid"]);

  type Reg = {
    id: string;
    contact_name: string;
    contact_email: string;
    university_name: string;
  };
  const regList = (regs as Reg[] | null) || [];

  // Pre-load already-sent recipient_ids
  const { data: sentRows } = await supabase
    .from("announcement_sends")
    .select("recipient_id")
    .eq("fair_id", f.id)
    .eq("email_type", "POSTFAIR_DATA");
  const alreadyRecipientIds = new Set(
    (sentRows || []).map((r) => r.recipient_id)
  );

  const portalExpiry = f.concluded_at
    ? new Date(
        new Date(f.concluded_at).getTime() + 30 * 24 * 60 * 60 * 1000
      ).toISOString()
    : null;
  const portalExpiresOn = portalExpiry
    ? formatDateLong(portalExpiry.slice(0, 10))
    : "30 days after fair concluded";

  const resend = getResend();
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const failures: { university: string; error: string }[] = [];

  for (const reg of regList) {
    // Upsert the rep email into announcement_recipients so we have a
    // recipient_id to log against.
    const { data: rec } = await supabase
      .from("announcement_recipients")
      .upsert(
        {
          email: reg.contact_email.toLowerCase().trim(),
          name: reg.contact_name,
          organization: reg.university_name,
          source: "PAST_PARTICIPANT",
          is_active: true,
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();
    if (!rec) {
      failed += 1;
      failures.push({
        university: reg.university_name,
        error: "Could not upsert recipient.",
      });
      continue;
    }

    if (alreadyRecipientIds.has(rec.id)) {
      skipped += 1;
      continue;
    }

    // Pull this university's scans
    const { data: scans } = await supabase
      .from("fair_scans")
      .select(
        `pass_uuid, rep_notes, interested, scanned_at,
         pass:fair_student_passes(pass_number, full_name, institution_name,
           current_course, current_semester, english_exam,
           budget_range, data_sharing_consent, whatsapp_consent,
           email_consent, phone, email,
           field_of_interest, preferred_countries)`
      )
      .eq("university_registration_id", reg.id)
      .order("scanned_at", { ascending: true });

    const list = (scans as ScanRow[] | null) || [];
    const studentsVisited = list.length;
    const studentsInterested = list.filter((s) => s.interested).length;
    const csv = buildCsvForScans(list);

    const portalUrl = `${appUrl()}/portal/${reg.id}/students`;

    try {
      const res = await resend.emails.send({
        from: FROM_EMAIL,
        to: reg.contact_email,
        subject: `Your student data — ${f.name}`,
        react: PostfairDataEmail({
          recipientName: reg.contact_name,
          universityName: reg.university_name,
          fairName: f.name,
          fairDateRange: formatFairDateRange(f),
          studentsVisited,
          studentsInterested,
          portalUrl,
          portalExpiresOn,
        }),
        attachments: [
          {
            filename: `${reg.university_name.replace(/[^a-zA-Z0-9-]+/g, "_")}-students.csv`,
            content: Buffer.from(csv, "utf-8").toString("base64"),
          },
        ],
      });
      const emailId =
        (res as { data?: { id?: string } }).data?.id ?? null;
      await supabase.from("announcement_sends").insert({
        fair_id: f.id,
        recipient_id: rec.id,
        email_type: "POSTFAIR_DATA",
        resend_email_id: emailId,
      });
      sent += 1;
    } catch (e) {
      failed += 1;
      failures.push({
        university: reg.university_name,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  if (sent > 0) {
    await supabase
      .from("fairs")
      .update({ postfair_data_sent_at: new Date().toISOString() })
      .eq("id", f.id);
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    failed,
    failures: failures.slice(0, 20),
  });
}
