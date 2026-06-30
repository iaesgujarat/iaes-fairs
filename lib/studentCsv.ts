import type { SupabaseClient } from "@supabase/supabase-js";

// Shared scan→CSV builder. Lifted out of the portal CSV route so the
// conclude-fair thank-you loop can attach the same file to each rep's
// email without re-implementing (and risking divergence from) the
// consent rules. The portal route keeps its access-code gate and calls
// this; the conclude loop calls it ungated (rep's own consented leads →
// rep's own confirmed registered address — signed off as acceptable).
//
// Consent semantics are intentionally identical to the portal: a scan is
// only included if the student gave data_sharing_consent, and the email /
// phone columns are blanked unless email_consent / whatsapp_consent.

interface RawScan {
  pass_uuid: string;
  rep_notes: string | null;
  interested: boolean;
  scanned_at: string;
  pass:
    | {
        pass_number: string;
        full_name: string;
        institution_name: string;
        current_course: string | null;
        current_semester: string | null;
        english_exam: string | null;
        budget_range: string | null;
        field_of_interest: string[];
        preferred_countries: string[];
        whatsapp_consent: boolean;
        email_consent: boolean;
        data_sharing_consent: boolean;
        phone: string;
        email: string;
      }
    | null
    | {
        pass_number: string;
        full_name: string;
        institution_name: string;
        current_course: string | null;
        current_semester: string | null;
        english_exam: string | null;
        budget_range: string | null;
        field_of_interest: string[];
        preferred_countries: string[];
        whatsapp_consent: boolean;
        email_consent: boolean;
        data_sharing_consent: boolean;
        phone: string;
        email: string;
      }[];
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n"))
    return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const HEADER = [
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
  "interested",
  "rep_notes",
  "scanned_at",
];

export interface StudentCsv {
  filename: string;
  /** Full CSV text (header + rows). */
  csv: string;
  /** Consent-filtered data rows, excluding the header. */
  rowCount: number;
}

/**
 * Build the consent-filtered student-leads CSV for one university
 * registration. Returns the CSV text, a filename, and the data-row count
 * so callers can decide whether a header-only file is worth sending.
 * Performs NO authorization — gate at the call site if needed.
 */
export async function buildStudentCsv(
  supabase: SupabaseClient,
  registrationId: string,
  universityName: string
): Promise<StudentCsv> {
  const { data: scans } = await supabase
    .from("fair_scans")
    .select(
      `pass_uuid, rep_notes, interested, scanned_at,
       pass:fair_student_passes(pass_number, full_name, institution_name,
         current_course, current_semester, english_exam,
         budget_range, field_of_interest, preferred_countries,
         whatsapp_consent, email_consent, data_sharing_consent,
         phone, email)`
    )
    .eq("university_registration_id", registrationId)
    .order("scanned_at", { ascending: false });

  const list = (scans as RawScan[] | null) || [];

  const lines = [HEADER.join(",")];
  let rowCount = 0;
  for (const s of list) {
    const p = Array.isArray(s.pass) ? s.pass[0] : s.pass;
    if (!p || !p.data_sharing_consent) continue;
    rowCount++;
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
        s.interested ? "yes" : "no",
        s.rep_notes,
        s.scanned_at,
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  const filename = `${universityName.replace(
    /[^a-zA-Z0-9-]+/g,
    "_"
  )}-students-${new Date().toISOString().slice(0, 10)}.csv`;

  return { filename, csv: lines.join("\n"), rowCount };
}
