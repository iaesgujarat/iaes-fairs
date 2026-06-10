import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";

export const runtime = "nodejs";

/**
 * DELETE = mark the lead unsubscribed (`is_active=false`) so the
 * announce-subscribers broadcaster skips it. Hard delete only if
 * ?hard=true is passed. Note: the mirrored whatsapp_contacts row is
 * governed separately (STOP webhook) and is not touched here.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const hard = url.searchParams.get("hard") === "true";

  const supabase = createAdminClient();
  if (hard) {
    const { error } = await supabase
      .from("announcement_leads")
      .delete()
      .eq("id", params.id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  }

  const { error } = await supabase
    .from("announcement_leads")
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deactivated: true });
}

/** PATCH { is_active: true } = re-activate a lead deactivated by mistake. */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { is_active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.is_active !== "boolean") {
    return NextResponse.json({ error: "is_active required" }, { status: 422 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("announcement_leads")
    .update({
      is_active: body.is_active,
      unsubscribed_at: body.is_active ? null : new Date().toISOString(),
    })
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
