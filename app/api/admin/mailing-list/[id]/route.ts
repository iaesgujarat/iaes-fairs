import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";

export const runtime = "nodejs";

/**
 * DELETE = mark as unsubscribed (`is_active=false`) so historical
 * `announcement_sends` rows remain valid. Hard delete only if
 * ?hard=true is passed.
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
      .from("announcement_recipients")
      .delete()
      .eq("id", params.id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  }

  const { error } = await supabase
    .from("announcement_recipients")
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deactivated: true });
}
