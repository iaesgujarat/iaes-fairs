import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasPortalAccess } from "@/lib/portalAccess";

export const runtime = "nodejs";

const PORTAL_DAYS = 30;

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

export async function GET(
  _req: Request,
  { params }: { params: { registrationId: string } }
) {
  const supabase = createAdminClient();

  const { data: reg } = await supabase
    .from("registrations")
    .select(`id, university_name, fair:fairs(concluded_at)`)
    .eq("id", params.registrationId)
    .maybeSingle();
  if (!reg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  type RegRow = {
    id: string;
    university_name: string;
    fair?:
      | { concluded_at: string | null }
      | { concluded_at: string | null }[]
      | null;
  };
  const r = reg as RegRow;
  const fair = Array.isArray(r.fair) ? r.fair[0] : r.fair;
  const concluded = fair?.concluded_at ? new Date(fair.concluded_at) : null;
  const expiresAt = concluded
    ? new Date(concluded.getTime() + PORTAL_DAYS * 24 * 60 * 60 * 1000)
    : null;
  if (expiresAt && Date.now() > expiresAt.getTime()) {
    return NextResponse.json(
      { error: "Portal access has expired." },
      { status: 410 }
    );
  }

  // Same gate as the portal page — the CSV must not bypass it.
  if (!(await hasPortalAccess(params.registrationId))) {
    return NextResponse.json(
      { error: "Locked. Open the portal page and enter the access code." },
      { status: 401 }
    );
  }

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
    .eq("university_registration_id", r.id)
    .order("scanned_at", { ascending: false });

  const list = (scans as RawScan[] | null) || [];

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
    "interested",
    "rep_notes",
    "scanned_at",
  ];
  const lines = [header.join(",")];
  for (const s of list) {
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
        s.interested ? "yes" : "no",
        s.rep_notes,
        s.scanned_at,
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  const filename = `${r.university_name.replace(
    /[^a-zA-Z0-9-]+/g,
    "_"
  )}-students-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
