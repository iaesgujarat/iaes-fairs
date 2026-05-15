import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_users")
    .select("email")
    .eq("email", user.email!)
    .maybeSingle();
  return data ? user : null;
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

interface PassJoinRow {
  full_name?: string;
  email?: string;
  phone?: string;
  institution_name?: string;
  current_course?: string;
  current_semester?: string;
  budget_range?: string;
  preferred_countries?: string[];
  field_of_interest?: string[];
  whatsapp_consent?: boolean;
  email_consent?: boolean;
  data_sharing_consent?: boolean;
  pass_number?: string;
}

interface UniJoinRow {
  university_name?: string;
}

/**
 * Admin export of every scan, with student + university joined.
 * GET /api/admin/scans?format=csv
 */
export async function GET(req: Request) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("fair_scans")
    .select(
      `scanned_at, interested, rep_notes,
       pass:fair_student_passes(pass_number, full_name, email, phone,
         institution_name, current_course, current_semester,
         budget_range, preferred_countries, field_of_interest,
         whatsapp_consent, email_consent, data_sharing_consent),
       university:registrations(university_name)`
    )
    .order("scanned_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const format = new URL(req.url).searchParams.get("format");
  if (format === "csv") {
    const headers = [
      "Scanned At",
      "University",
      "Pass No.",
      "Student Name",
      "Email",
      "Phone",
      "Institution",
      "Course",
      "Year",
      "Budget",
      "Countries",
      "Fields",
      "Interested",
      "Rep Notes",
    ];

    const lines = [headers.join(",")];
    for (const row of data || []) {
      const r = row as {
        scanned_at?: string;
        interested?: boolean;
        rep_notes?: string;
        pass?: PassJoinRow | PassJoinRow[];
        university?: UniJoinRow | UniJoinRow[];
      };
      const pass = Array.isArray(r.pass) ? r.pass[0] : r.pass;
      const uni = Array.isArray(r.university) ? r.university[0] : r.university;
      lines.push(
        [
          r.scanned_at,
          uni?.university_name,
          pass?.pass_number,
          pass?.full_name,
          pass?.email_consent ? pass?.email : "",
          pass?.whatsapp_consent ? pass?.phone : "",
          pass?.institution_name,
          pass?.current_course,
          pass?.current_semester,
          pass?.budget_range,
          (pass?.preferred_countries || []).join("; "),
          (pass?.field_of_interest || []).join("; "),
          r.interested ? "yes" : "no",
          r.rep_notes,
        ]
          .map(escapeCsv)
          .join(",")
      );
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="iaes-scans-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ scans: data });
}
