import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import type { WaitlistSignup } from "@/types";

export const runtime = "nodejs";

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waitlist_signups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const signups = (data as WaitlistSignup[] | null) ?? [];

  const format = new URL(req.url).searchParams.get("format");
  if (format === "csv") {
    const headers = [
      "Signed Up At",
      "University",
      "Contact Name",
      "Email",
      "Country",
      "Merged to Mailing List",
    ];
    const lines = [headers.join(",")];
    for (const s of signups) {
      lines.push(
        [
          s.created_at,
          s.university_name,
          s.contact_name ?? "",
          s.email,
          s.country,
          s.merged_to_recipients ? "Yes" : "No",
        ]
          .map(escapeCsv)
          .join(",")
      );
    }
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="iaes-waitlist-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ signups });
}
