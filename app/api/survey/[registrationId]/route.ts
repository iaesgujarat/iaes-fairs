import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Post-fair feedback. The unguessable registrationId in the URL is the
// secret (same trust model as the leads portal link) — no access code,
// since this collects the rep's opinions, not student PII. One row per
// registration; resubmitting updates it (upsert on registration_id).

const rating = z.number().int().min(1).max(5).optional().nullable();

const schema = z.object({
  overall_rating: rating,
  leads_rating: rating,
  organization_rating: rating,
  recommend_rating: rating,
  what_went_well: z.string().max(5000).optional().nullable(),
  what_to_improve: z.string().max(5000).optional().nullable(),
  additional_comments: z.string().max(5000).optional().nullable(),
});

const clean = (v: string | null | undefined) => {
  const t = v?.trim();
  return t ? t : null;
};

export async function POST(
  req: Request,
  { params }: { params: { registrationId: string } }
) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid response." },
      { status: 422 }
    );
  }
  const d = parsed.data;

  // Require at least one rating so we don't store empty submissions.
  if (
    d.overall_rating == null &&
    d.leads_rating == null &&
    d.organization_rating == null &&
    d.recommend_rating == null &&
    !clean(d.what_went_well) &&
    !clean(d.what_to_improve) &&
    !clean(d.additional_comments)
  ) {
    return NextResponse.json(
      { error: "Please rate the fair or leave a comment before submitting." },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();

  // Resolve + snapshot the registration. Confirms the link is real.
  const { data: reg } = await supabase
    .from("registrations")
    .select(`id, university_name, contact_name, fair_id, fair:fairs(name)`)
    .eq("id", params.registrationId)
    .maybeSingle();
  if (!reg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  type RegRow = {
    id: string;
    university_name: string | null;
    contact_name: string | null;
    fair_id: string | null;
    fair?: { name: string } | { name: string }[] | null;
  };
  const r = reg as RegRow;
  const fair = Array.isArray(r.fair) ? r.fair[0] : r.fair;

  const row = {
    registration_id: r.id,
    fair_id: r.fair_id,
    university_name: r.university_name,
    contact_name: r.contact_name,
    fair_name: fair?.name ?? null,
    overall_rating: d.overall_rating ?? null,
    leads_rating: d.leads_rating ?? null,
    organization_rating: d.organization_rating ?? null,
    recommend_rating: d.recommend_rating ?? null,
    what_went_well: clean(d.what_went_well),
    what_to_improve: clean(d.what_to_improve),
    additional_comments: clean(d.additional_comments),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("fair_feedback")
    .upsert(row, { onConflict: "registration_id" });
  if (error) {
    return NextResponse.json(
      { error: "Could not save. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
