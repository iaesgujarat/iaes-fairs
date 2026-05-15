import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SignOutButton } from "@/components/SignOutButton";
import { SendActionButton } from "@/components/SendActionButton";
import { formatDateLong } from "@/lib/mailerHelpers";
import type { Fair, AnnouncementSend } from "@/types";

export const dynamic = "force-dynamic";

interface RegRow {
  id: string;
  university_name: string;
  contact_email: string;
  status: string;
  scan_count: number;
  interested_count: number;
  data_sent: boolean;
  data_sent_at: string | null;
}

export default async function PostfairPage({
  params,
}: {
  params: { fairId: string };
}) {
  const session = await createClient().auth.getUser();
  const userEmail = session.data.user?.email || "Admin";

  const supabase = createAdminClient();
  const [
    { data: fair },
    { data: regs },
    { data: scans },
    { data: sentRows },
    { count: passes },
    { count: checkedIn },
  ] = await Promise.all([
    supabase.from("fairs").select("*").eq("id", params.fairId).maybeSingle(),
    supabase
      .from("registrations")
      .select(
        `id, university_name, contact_email, contact_name, status`
      )
      .eq("fair_id", params.fairId)
      .in("status", ["confirmed", "paid"]),
    supabase
      .from("fair_scans")
      .select("university_registration_id, interested")
      .eq("fair_id", params.fairId),
    supabase
      .from("announcement_sends")
      .select(
        `recipient_id, sent_at, recipient:announcement_recipients(email)`
      )
      .eq("fair_id", params.fairId)
      .eq("email_type", "POSTFAIR_DATA"),
    supabase
      .from("fair_student_passes")
      .select("*", { count: "exact", head: true })
      .eq("fair_id", params.fairId),
    supabase
      .from("fair_student_passes")
      .select("*", { count: "exact", head: true })
      .eq("fair_id", params.fairId)
      .eq("checked_in", true),
  ]);

  if (!fair) notFound();
  const f = fair as Fair;

  type RegInput = {
    id: string;
    university_name: string;
    contact_email: string;
    contact_name: string;
    status: string;
  };
  type ScanInput = { university_registration_id: string; interested: boolean };
  type SentInput = {
    recipient_id: string;
    sent_at: string;
    recipient?: { email?: string } | { email?: string }[] | null;
  };

  const regList = (regs as RegInput[] | null) || [];
  const scanList = (scans as ScanInput[] | null) || [];
  const sentList = (sentRows as SentInput[] | null) || [];

  const scansByUni = new Map<string, { count: number; interested: number }>();
  for (const s of scanList) {
    const cur = scansByUni.get(s.university_registration_id) ?? {
      count: 0,
      interested: 0,
    };
    cur.count += 1;
    if (s.interested) cur.interested += 1;
    scansByUni.set(s.university_registration_id, cur);
  }

  // Map: lower(email) -> last sent_at for POSTFAIR_DATA
  const sentByEmail = new Map<string, string>();
  for (const r of sentList) {
    const rec = Array.isArray(r.recipient) ? r.recipient[0] : r.recipient;
    if (!rec?.email) continue;
    const email = rec.email.toLowerCase();
    const cur = sentByEmail.get(email);
    if (!cur || r.sent_at > cur) sentByEmail.set(email, r.sent_at);
  }

  const rows: RegRow[] = regList.map((r) => {
    const ss = scansByUni.get(r.id) ?? { count: 0, interested: 0 };
    const sentAt = sentByEmail.get(r.contact_email.toLowerCase()) ?? null;
    return {
      id: r.id,
      university_name: r.university_name,
      contact_email: r.contact_email,
      status: r.status,
      scan_count: ss.count,
      interested_count: ss.interested,
      data_sent: !!sentAt,
      data_sent_at: sentAt,
    };
  });

  const totalStudents = passes ?? 0;
  const totalCheckedIn = checkedIn ?? 0;
  const totalScans = scanList.length;
  const remaining = rows.filter((r) => !r.data_sent).length;

  const concludedReadiness =
    f.status === "COMPLETED" || f.status === "ARCHIVED";

  return (
    <>
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-6">
            <Link href="/admin/dashboard" className="flex items-baseline gap-2">
              <span className="font-serif text-xl font-semibold text-navy">
                IAES
              </span>
              <span className="text-xs uppercase tracking-[0.18em] text-gold-500">
                Admin
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/admin/dashboard"
                className="text-navy/65 hover:text-navy"
              >
                Registrations
              </Link>
              <Link
                href="/admin/fairs"
                className="text-navy/65 hover:text-navy"
              >
                Fairs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-navy/70">{userEmail}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-2">
          <Link
            href={`/admin/fairs/${f.id}`}
            className="text-sm text-navy/55 hover:text-navy"
          >
            &larr; Back to {f.name}
          </Link>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-navy">
          Post-Fair Data
        </h1>
        <p className="mt-1 text-sm text-navy/60">
          Send each university their student leads, with a CSV attached and a
          30-day portal link.
        </p>

        {!concludedReadiness && (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This action is available only after the fair is{" "}
            <strong>concluded</strong>. Current status: {f.status ?? "unknown"}.
          </div>
        )}

        {f.concluded_at && (
          <p className="mt-3 text-xs text-navy/55">
            Concluded {formatDateLong(f.concluded_at)} · Portal access for
            participating universities valid until{" "}
            {formatDateLong(
              new Date(
                new Date(f.concluded_at).getTime() +
                  30 * 24 * 60 * 60 * 1000
              )
                .toISOString()
                .slice(0, 10)
            )}
            .
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <Stat
            label="Student Passes"
            value={totalStudents.toLocaleString("en-IN")}
          />
          <Stat
            label="Checked In"
            value={totalCheckedIn.toLocaleString("en-IN")}
            accent="green"
          />
          <Stat label="Total Scans" value={totalScans.toLocaleString("en-IN")} />
          <Stat
            label="Universities (paid/confirmed)"
            value={rows.length.toLocaleString("en-IN")}
          />
        </div>

        <div className="mt-8 rounded-lg border border-navy/10 bg-white shadow-card">
          <div className="border-b border-navy/10 px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-navy/55">
              Data sharing status
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
                <tr>
                  <Th>University</Th>
                  <Th>Scans</Th>
                  <Th>Interested</Th>
                  <Th>Data Sent</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-navy/55"
                    >
                      No paid/confirmed registrations.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-navy/5 align-top hover:bg-cream/40"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">
                        {r.university_name}
                      </div>
                      <div className="text-xs text-navy/55">
                        {r.contact_email}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-navy">
                      {r.scan_count}
                    </td>
                    <td className="px-4 py-3 text-navy/80">
                      {r.interested_count}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.data_sent ? (
                        <span className="text-emerald-700">
                          ✅{" "}
                          {r.data_sent_at
                            ? formatDateLong(r.data_sent_at)
                            : ""}
                        </span>
                      ) : (
                        <span className="text-navy/45">⏳ Not sent</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {concludedReadiness && (
          <div className="mt-8 rounded-lg border border-navy/10 bg-white p-6 shadow-card">
            <p className="text-sm font-medium text-navy">
              Send post-fair data to {remaining} remaining{" "}
              {remaining === 1 ? "university" : "universities"}.
            </p>
            <p className="mt-1 text-xs text-navy/55">
              Already-sent universities are skipped automatically.
            </p>
            <div className="mt-4">
              <SendActionButton
                path={`/api/admin/fairs/${f.id}/postfair-data`}
                label={`Send to ${remaining} remaining →`}
                testLabel="Send test to me"
                confirmText={`Send post-fair data to ${remaining} ${
                  remaining === 1 ? "university" : "universities"
                }? CSV attachments will be generated.`}
              />
            </div>
            <p className="mt-4 text-xs text-navy/55">
              Tip: master report — download all scans (consent-filtered) as CSV
              from{" "}
              <a
                href="/api/admin/scans?format=csv"
                className="text-navy underline"
              >
                /api/admin/scans
              </a>
              .
            </p>
          </div>
        )}
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
  accent?: "default" | "green" | "navy";
}) {
  const bar: Record<typeof accent, string> = {
    default: "bg-navy/30",
    green: "bg-emerald-500",
    navy: "bg-gold",
  };
  return (
    <div className="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
      <div className={`h-1 ${bar[accent]}`} />
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

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-left">{children}</th>;
}

// keep types imported for tsconfig isolatedModules
void undefined as unknown as AnnouncementSend;
