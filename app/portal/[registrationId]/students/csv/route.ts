import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasPortalAccess } from "@/lib/portalAccess";
import { buildStudentCsv } from "@/lib/studentCsv";

export const runtime = "nodejs";

const PORTAL_DAYS = 30;

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

  const { csv, filename } = await buildStudentCsv(
    supabase,
    r.id,
    r.university_name
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
