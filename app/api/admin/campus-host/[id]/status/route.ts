import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";

export const runtime = "nodejs";

// PATCH /api/admin/campus-host/[id]/status
// Body: { status: "new" | "contacted" | "scheduled" | "declined" | "cancelled" }
//
// Admin-only workflow transition for a campus_host_requests row,
// mirroring the institution status route. Used by the
// CampusHostAdminTable action buttons.
const bodySchema = z
  .object({
    status: z.enum(["new", "contacted", "scheduled", "declined", "cancelled"]),
  })
  .strict();

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from("campus_host_requests")
    .select("id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("campus_host_requests")
    .update({ status: parsed.data.status })
    .eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: parsed.data.status });
}
