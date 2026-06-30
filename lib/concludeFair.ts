import type { SupabaseClient } from "@supabase/supabase-js";
import { getResend } from "@/lib/resend";
import { appUrl } from "@/lib/mailerHelpers";
import { buildStudentCsv } from "@/lib/studentCsv";
import { canTransition } from "@/lib/fairStatus";
import { UniversityThankYouEmail } from "@/emails/UniversityThankYouEmail";
import { StudentThankYouEmail } from "@/emails/StudentThankYouEmail";
import type { Fair, FairStatus } from "@/types";

// v13 spec: thank-you blast goes from the educationfair@ identity.
const THANKYOU_FROM = "IAES Education Fairs <educationfair@iaesgujarat.org>";
const THANKYOU_REPLY_TO = "educationfair@iaesgujarat.org";

export interface FairStats {
  stat_universities_participated: number;
  stat_students_attended: number;
  stat_booth_scans: number;
  stat_cities_visited: number;
}

export interface ConcludeResult extends FairStats {
  fairName: string;
}

/** Counts computed BEFORE the status flips — no race with the update. */
export async function computeFairStats(
  supabase: SupabaseClient,
  fairId: string
): Promise<FairStats> {
  const [univ, students, scans, cities] = await Promise.all([
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("fair_id", fairId)
      .eq("status", "confirmed"),
    supabase
      .from("fair_student_passes")
      .select("*", { count: "exact", head: true })
      .eq("fair_id", fairId)
      .eq("checked_in", true),
    supabase
      .from("fair_scans")
      .select("*", { count: "exact", head: true })
      .eq("fair_id", fairId),
    supabase
      .from("institution_registrations")
      .select("city")
      .eq("fair_id", fairId),
  ]);

  const uniqueCities = new Set(
    ((cities.data ?? []) as { city: string | null }[])
      .map((r) => (r.city ?? "").trim().toLowerCase())
      .filter(Boolean)
  ).size;

  return {
    stat_universities_participated: univ.count ?? 0,
    stat_students_attended: students.count ?? 0,
    stat_booth_scans: scans.count ?? 0,
    stat_cities_visited: uniqueCities,
  };
}

/**
 * Conclude a fair: cache stats, flip status → COMPLETED, log it, then
 * fire thank-you emails. Shared by the midnight cron (triggeredBy AUTO,
 * no session) and the manual admin route (MANUAL). Service-role client
 * only — never calls assertAdmin (the cron has no request context).
 *
 * Idempotent: throws "already concluded" on a second call so callers
 * can surface it gracefully. Stats/status are committed before emails;
 * a thank-you failure never rolls back the conclusion.
 */
export async function concludeFairById(
  supabase: SupabaseClient,
  fairId: string,
  triggeredBy: "AUTO" | "MANUAL",
  changedBy: string
): Promise<ConcludeResult> {
  const { data: fairRow } = await supabase
    .from("fairs")
    .select("*")
    .eq("id", fairId)
    .maybeSingle();
  if (!fairRow) throw new Error("Fair not found.");

  const fair = fairRow as Fair;
  const from = (fair.status ?? "DRAFT") as FairStatus;
  if (from === "COMPLETED") throw new Error("Fair is already concluded.");
  if (!canTransition(from, "COMPLETED")) {
    throw new Error(`Cannot conclude a fair in ${from} state.`);
  }

  const stats = await computeFairStats(supabase, fairId);
  const nowIso = new Date().toISOString();

  const { error: updErr } = await supabase
    .from("fairs")
    .update({
      status: "COMPLETED",
      is_active: false,
      concluded_at: nowIso,
      auto_concluded: triggeredBy === "AUTO",
      ...stats,
      stat_cached_at: nowIso,
    })
    .eq("id", fairId);
  if (updErr) throw new Error(updErr.message);

  await supabase.from("fair_status_log").insert({
    fair_id: fairId,
    from_status: from,
    to_status: "COMPLETED",
    changed_by: changedBy,
    note:
      triggeredBy === "AUTO"
        ? `Auto-concluded at midnight IST. Stats: ${stats.stat_universities_participated} universities, ${stats.stat_students_attended} students, ${stats.stat_booth_scans} scans.`
        : "Manually concluded by admin (emergency override).",
  });

  // Best-effort: a batch failure must not roll back a concluded fair.
  try {
    await sendUniversityThankYouEmails(
      supabase,
      fair,
      stats.stat_universities_participated
    );
  } catch (e) {
    console.error("[conclude] university thank-you batch failed:", e);
  }
  try {
    await sendStudentThankYouEmails(supabase, fair);
  } catch (e) {
    console.error("[conclude] student thank-you batch failed:", e);
  }

  await supabase
    .from("fairs")
    .update({ thankyou_emails_sent_at: new Date().toISOString() })
    .eq("id", fairId);

  return { ...stats, fairName: fair.name };
}

// ── Thank-you blasts ───────────────────────────────────────────────
// Per-recipient try/catch — one failure never stops the loop. No
// inter-send delay (matches the repo's reminderSender convention).

interface RegRow {
  id: string;
  university_name: string;
  contact_name: string | null;
  contact_email: string;
}

async function sendUniversityThankYouEmails(
  supabase: SupabaseClient,
  fair: Fair,
  totalUniversities: number
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const { data } = await supabase
    .from("registrations")
    .select("id, university_name, contact_name, contact_email")
    .eq("fair_id", fair.id)
    .eq("status", "confirmed");

  const regs = (data as RegRow[] | null) ?? [];
  if (regs.length === 0) return;

  const resend = getResend();
  const portalExpiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  for (const reg of regs) {
    if (!reg.contact_email) continue;
    try {
      const [{ count: scansCount }, { count: interestedCount }] =
        await Promise.all([
          supabase
            .from("fair_scans")
            .select("*", { count: "exact", head: true })
            .eq("university_registration_id", reg.id),
          supabase
            .from("fair_scans")
            .select("*", { count: "exact", head: true })
            .eq("university_registration_id", reg.id)
            .eq("interested", true),
        ]);

      // Attach the rep's own consent-filtered leads CSV directly — saves
      // them the portal-download round trip. Portal link stays as a
      // fallback. Skip a header-only file (no consented leads) — an empty
      // attachment reads as a bug; the portal link still covers them.
      const leadsCsv = await buildStudentCsv(
        supabase,
        reg.id,
        reg.university_name
      );

      await resend.emails.send({
        from: THANKYOU_FROM,
        replyTo: THANKYOU_REPLY_TO,
        to: [reg.contact_email],
        subject: `Thank You for Participating — ${fair.name}`,
        react: UniversityThankYouEmail({
          repName: reg.contact_name || reg.university_name,
          universityName: reg.university_name,
          fairName: fair.name,
          fairCity: fair.city,
          scansCount: scansCount ?? 0,
          interestedCount: interestedCount ?? 0,
          totalUniversities,
          portalLink: `${appUrl()}/portal/${reg.id}/students`,
          portalExpiresAt,
          surveyLink: `${appUrl()}/survey/${reg.id}`,
        }),
        attachments:
          leadsCsv.rowCount > 0
            ? [
                {
                  filename: leadsCsv.filename,
                  content: Buffer.from(leadsCsv.csv, "utf-8"),
                },
              ]
            : undefined,
      });
    } catch (err) {
      console.error(
        `[conclude] university email failed for ${reg.contact_email}:`,
        err
      );
    }
  }
}

interface PassRow {
  pass_uuid: string;
  full_name: string;
  email: string;
  institution_name: string | null;
}

async function sendStudentThankYouEmails(
  supabase: SupabaseClient,
  fair: Fair
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const { data } = await supabase
    .from("fair_student_passes")
    .select("pass_uuid, full_name, email, institution_name")
    .eq("fair_id", fair.id)
    .eq("checked_in", true)
    .eq("email_consent", true);

  const passes = (data as PassRow[] | null) ?? [];
  if (passes.length === 0) return;

  const resend = getResend();

  for (const pass of passes) {
    if (!pass.email) continue;
    try {
      const { count: boothsVisited } = await supabase
        .from("fair_scans")
        .select("*", { count: "exact", head: true })
        .eq("pass_uuid", pass.pass_uuid);

      await resend.emails.send({
        from: THANKYOU_FROM,
        replyTo: THANKYOU_REPLY_TO,
        to: [pass.email],
        subject: `Thank You for Attending — ${fair.name}`,
        react: StudentThankYouEmail({
          studentName: pass.full_name,
          institutionName: pass.institution_name,
          fairName: fair.name,
          fairCity: fair.city,
          boothsVisited: boothsVisited ?? 0,
        }),
      });
    } catch (err) {
      console.error(
        `[conclude] student email failed for ${pass.email}:`,
        err
      );
    }
  }
}
