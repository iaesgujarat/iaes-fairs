import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import type { Fair } from "@/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  active: z.boolean(),
  note: z.string().max(2000).optional(),
});

/**
 * Toggle the campus-host programme for a fair (the public "Request a
 * Campus Visit" card + form are gated on fairs.campus_host_requests_active).
 * Unlike the payment gateway this is two-way: it only opens/closes the
 * request form — existing requests are untouched either way.
 */
export async function POST(
  req: Request,
  { params }: { params: { fairId: string } }
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
    return NextResponse.json({ error: "Invalid body." }, { status: 422 });
  }
  const { active, note } = parsed.data;

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

  if (active && f.status !== "PUBLISHED") {
    return NextResponse.json(
      {
        error:
          "Campus-host requests can only be opened while the fair is published.",
      },
      { status: 409 }
    );
  }

  if (!!f.campus_host_requests_active === active) {
    return NextResponse.json({ ok: true, unchanged: true, active });
  }

  const { error: updErr } = await supabase
    .from("fairs")
    .update(
      active
        ? {
            campus_host_requests_active: true,
            campus_host_activated_at: new Date().toISOString(),
            campus_host_activation_note: note?.trim() || null,
          }
        : { campus_host_requests_active: false }
    )
    .eq("id", f.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  await supabase.from("fair_status_log").insert({
    fair_id: f.id,
    from_status: f.status ?? null,
    to_status: f.status ?? "PUBLISHED",
    changed_by: admin.email,
    note: `Campus-host requests ${active ? "OPENED" : "CLOSED"}.${
      active && note?.trim() ? ` — ${note.trim()}` : ""
    }`,
  });

  return NextResponse.json({ ok: true, active });
}
