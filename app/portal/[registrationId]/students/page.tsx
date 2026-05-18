import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PortalStudents } from "@/components/PortalStudents";
import { PortalGate } from "@/components/PortalGate";
import { hasPortalAccess } from "@/lib/portalAccess";
import { formatDateLong } from "@/lib/mailerHelpers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your student leads — IAES",
  robots: "noindex,nofollow",
};

interface PortalScan {
  pass_uuid: string;
  pass_number: string;
  full_name: string;
  institution_name: string;
  current_course: string | null;
  current_semester: string | null;
  english_exam: string | null;
  field_of_interest: string[];
  budget_range: string | null;
  preferred_countries: string[];
  phone: string | null;
  email: string | null;
  rep_notes: string | null;
  interested: boolean;
  scanned_at: string;
}

const PORTAL_DAYS = 30;

export default async function PortalStudentsPage({
  params,
}: {
  params: { registrationId: string };
}) {
  const supabase = createAdminClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select(
      `id, university_name, contact_name, contact_email, status,
       fair:fairs(id, name, concluded_at, fair_date_start, fair_date_end, status)`
    )
    .eq("id", params.registrationId)
    .maybeSingle();
  if (!reg) notFound();

  type RegRow = {
    id: string;
    university_name: string;
    contact_name: string;
    contact_email: string;
    status: string;
    fair?:
      | { id: string; name: string; concluded_at: string | null; fair_date_start: string | null; fair_date_end: string | null; status: string | null }
      | { id: string; name: string; concluded_at: string | null; fair_date_start: string | null; fair_date_end: string | null; status: string | null }[]
      | null;
  };
  const r = reg as RegRow;
  const fair = (Array.isArray(r.fair) ? r.fair[0] : r.fair) ?? null;

  if (!fair) notFound();

  // 30-day expiry check
  const concluded = fair.concluded_at ? new Date(fair.concluded_at) : null;
  const expiresAt = concluded
    ? new Date(concluded.getTime() + PORTAL_DAYS * 24 * 60 * 60 * 1000)
    : null;
  const expired = expiresAt ? Date.now() > expiresAt.getTime() : false;

  if (expired) {
    return (
      <>
        <SiteHeader variant="light" />
        <main className="mx-auto max-w-2xl px-6 py-20 text-center">
          <h1 className="font-serif text-3xl font-semibold text-navy">
            Portal access expired
          </h1>
          <p className="mt-3 text-navy/70">
            This 30-day portal window closed on{" "}
            {expiresAt
              ? formatDateLong(expiresAt.toISOString().slice(0, 10))
              : "—"}
            .
          </p>
          <p className="mt-3 text-sm text-navy/60">
            Need the data? Contact{" "}
            <a
              href="mailto:eduadviser@iaesgujarat.org"
              className="text-gold-600 hover:underline"
            >
              eduadviser@iaesgujarat.org
            </a>
            .
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-navy hover:text-gold-600"
          >
            &larr; Back to home
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  }

  // Access gate — admin session bypasses; otherwise require the
  // last-4-phone challenge (signed cookie). Shown only when not
  // expired, so a stale link still gets the clearer expiry message.
  if (!(await hasPortalAccess(params.registrationId))) {
    return (
      <>
        <SiteHeader variant="light" />
        <main className="mx-auto max-w-5xl px-6 py-16">
          <PortalGate
            registrationId={r.id}
            universityName={r.university_name}
            fairName={fair.name}
          />
        </main>
        <SiteFooter />
      </>
    );
  }

  // Pull this university's scans
  const { data: scans } = await supabase
    .from("fair_scans")
    .select(
      `pass_uuid, rep_notes, interested, scanned_at,
       pass:fair_student_passes(pass_number, full_name, institution_name,
         current_course, current_semester, english_exam,
         budget_range, field_of_interest, preferred_countries,
         whatsapp_consent, email_consent, data_sharing_consent,
         phone, email)`
    )
    .eq("university_registration_id", r.id)
    .order("scanned_at", { ascending: false });

  type RawScan = {
    pass_uuid: string;
    rep_notes: string | null;
    interested: boolean;
    scanned_at: string;
    pass:
      | {
          pass_number: string;
          full_name: string;
          institution_name: string;
          current_course: string | null;
          current_semester: string | null;
          english_exam: string | null;
          budget_range: string | null;
          field_of_interest: string[];
          preferred_countries: string[];
          whatsapp_consent: boolean;
          email_consent: boolean;
          data_sharing_consent: boolean;
          phone: string;
          email: string;
        }
      | {
          pass_number: string;
          full_name: string;
          institution_name: string;
          current_course: string | null;
          current_semester: string | null;
          english_exam: string | null;
          budget_range: string | null;
          field_of_interest: string[];
          preferred_countries: string[];
          whatsapp_consent: boolean;
          email_consent: boolean;
          data_sharing_consent: boolean;
          phone: string;
          email: string;
        }[]
      | null;
  };

  const list: PortalScan[] = ((scans as RawScan[] | null) || [])
    .map((s) => {
      const p = Array.isArray(s.pass) ? s.pass[0] : s.pass;
      if (!p || !p.data_sharing_consent) return null;
      return {
        pass_uuid: s.pass_uuid,
        pass_number: p.pass_number,
        full_name: p.full_name,
        institution_name: p.institution_name,
        current_course: p.current_course,
        current_semester: p.current_semester,
        english_exam: p.english_exam,
        field_of_interest: p.field_of_interest || [],
        budget_range: p.budget_range,
        preferred_countries: p.preferred_countries || [],
        phone: p.whatsapp_consent ? p.phone : null,
        email: p.email_consent ? p.email : null,
        rep_notes: s.rep_notes,
        interested: s.interested,
        scanned_at: s.scanned_at,
      } as PortalScan;
    })
    .filter((x): x is PortalScan => x !== null);

  const interestedCount = list.filter((s) => s.interested).length;

  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
          {fair.name}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-navy">
          Your student leads
        </h1>
        <p className="mt-1 text-sm text-navy/60">
          {r.university_name}
          {expiresAt && (
            <>
              {" "}
              · Access valid until{" "}
              {formatDateLong(expiresAt.toISOString().slice(0, 10))}
            </>
          )}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat
            label="Students who visited"
            value={list.length.toLocaleString("en-IN")}
          />
          <Stat
            label="Marked interested"
            value={interestedCount.toLocaleString("en-IN")}
            accent="green"
          />
          <Stat
            label="Fair date"
            value={
              fair.fair_date_start
                ? formatDateLong(fair.fair_date_start)
                : "—"
            }
          />
        </div>

        <PortalStudents
          students={list}
          downloadHref={`/portal/${r.id}/students/csv`}
        />
      </main>
      <SiteFooter />
    </>
  );
}

function Stat({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "green";
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
      <div
        className={`h-1 ${
          accent === "green" ? "bg-emerald-500" : "bg-navy/30"
        }`}
      />
      <div className="p-5">
        <p className="text-xs uppercase tracking-wider text-navy/55">
          {label}
        </p>
        <p className="mt-2 font-serif text-2xl font-semibold text-navy">
          {value}
        </p>
      </div>
    </div>
  );
}
