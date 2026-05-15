import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";

export const runtime = "nodejs";

/**
 * Imports every distinct `contact_email` from past university registrations
 * into `announcement_recipients` as PAST_PARTICIPANT. Idempotent: existing
 * rows are left alone (we don't override `source` or reactivate
 * unsubscribed contacts).
 */
export async function POST() {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: regs, error } = await supabase
    .from("registrations")
    .select("contact_email, contact_name, university_name");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const seen = new Set<string>();
  const rows: Array<{
    email: string;
    name: string | null;
    organization: string | null;
    source: "PAST_PARTICIPANT";
  }> = [];
  for (const r of regs || []) {
    const email = (r.contact_email || "").toLowerCase().trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    rows.push({
      email,
      name: r.contact_name || null,
      organization: r.university_name || null,
      source: "PAST_PARTICIPANT",
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0 });
  }

  // Find existing emails to skip
  const emails = rows.map((r) => r.email);
  const { data: existing } = await supabase
    .from("announcement_recipients")
    .select("email")
    .in("email", emails);
  const existingSet = new Set((existing || []).map((e) => e.email));

  const toInsert = rows.filter((r) => !existingSet.has(r.email));
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase
      .from("announcement_recipients")
      .insert(toInsert);
    if (insErr) {
      return NextResponse.json(
        { error: insErr.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    imported: toInsert.length,
    skipped: rows.length - toInsert.length,
  });
}
