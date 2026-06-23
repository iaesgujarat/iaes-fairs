import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SignOutButton } from "@/components/SignOutButton";
import { SendScannerGuideButton } from "@/components/admin/SendScannerGuideButton";
import { AnnounceSubscribersButton } from "@/components/admin/AnnounceSubscribersButton";
import { FairLifecycleActions } from "@/components/FairLifecycleActions";
import { GatewayToggle } from "@/components/GatewayToggle";
import { CampusHostToggle } from "@/components/admin/CampusHostToggle";
import { formatDateShort, formatINR, formatUSD } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/fairStatus";
import { getFairPricing } from "@/lib/pricing";
import type {
  Fair,
  FairStatus,
  FairStatusLog,
  FairItineraryStop,
} from "@/types";

export const dynamic = "force-dynamic";

const DOT_BY_STATUS: Record<FairStatus, string> = {
  DRAFT: "bg-gray-400",
  PUBLISHED: "bg-blue-500",
  REGISTRATION_CLOSED: "bg-amber-400",
  ONGOING: "bg-emerald-500 animate-pulse",
  COMPLETED: "bg-teal-500",
  ARCHIVED: "bg-gray-400",
  CANCELLED: "bg-red-500",
};

function fairDateLabel(fair: Fair): string {
  const start = fair.fair_date_start || fair.fair_date;
  const end = fair.fair_date_end;
  if (!end || end === start) return formatDateShort(start);
  const startD = new Date(start);
  const endD = new Date(end);
  if (
    startD.getMonth() === endD.getMonth() &&
    startD.getFullYear() === endD.getFullYear()
  ) {
    return `${startD.getDate()}–${endD.getDate()} ${endD.toLocaleDateString(
      "en-IN",
      { month: "long", year: "numeric" }
    )}`;
  }
  return `${formatDateShort(start)} – ${formatDateShort(end)}`;
}

interface RawRegistrationsAgg {
  status: string;
  payment_currency: string;
  addon_tables?: number | null;
  addon_reps?: number | null;
  addon_cost_usd?: number | null;
  payments?: { payment_status: string; amount_paid: number; currency: string }[];
}

export default async function FairControlPanel({
  params,
}: {
  params: { fairId: string };
}) {
  const session = await createClient().auth.getUser();
  const userEmail = session.data.user?.email || "Admin";

  const supabase = createAdminClient();
  const [
    { data: fair },
    { data: log },
    { data: regs },
    { count: passCount },
    { data: stopsData },
    { data: premiumStatus },
    { data: tableSummary },
    { count: hostRequestCount },
  ] = await Promise.all([
    supabase.from("fairs").select("*").eq("id", params.fairId).maybeSingle(),
    supabase
      .from("fair_status_log")
      .select("*")
      .eq("fair_id", params.fairId)
      .order("changed_at", { ascending: false }),
    supabase
      .from("registrations")
      .select(
        `status, payment_currency, addon_tables, addon_reps, addon_cost_usd,
         payments(payment_status, amount_paid, currency)`
      )
      .eq("fair_id", params.fairId),
    supabase
      .from("fair_student_passes")
      .select("*", { count: "exact", head: true })
      .eq("fair_id", params.fairId),
    supabase
      .from("fair_itinerary")
      .select("*")
      .eq("fair_id", params.fairId)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true }),
    supabase
      .from("premium_slot_status")
      .select("premium_slots_total, slots_taken, slots_remaining")
      .eq("fair_id", params.fairId)
      .maybeSingle(),
    supabase
      .from("fair_table_summary")
      .select(
        "premium_tables_in_use, standard_base_tables, addon_tables_taken, addon_tables_pool, total_tables_in_use"
      )
      .eq("fair_id", params.fairId)
      .maybeSingle(),
    supabase
      .from("campus_host_requests")
      .select("*", { count: "exact", head: true })
      .eq("fair_id", params.fairId),
  ]);

  // v14 — null pre-migration / no premium rows; cards degrade.
  const premium = premiumStatus as {
    premium_slots_total: number;
    slots_taken: number;
    slots_remaining: number;
  } | null;
  const tables = tableSummary as {
    premium_tables_in_use: number;
    standard_base_tables: number;
    addon_tables_taken: number;
    addon_tables_pool: number;
    total_tables_in_use: number;
  } | null;

  // Empty if the fair_itinerary table isn't migrated yet — never throws.
  const itineraryStops = (stopsData as FairItineraryStop[] | null) ?? [];
  const unconfirmedPublic = itineraryStops.filter(
    (s) => s.is_public && !s.is_confirmed
  ).length;

  if (!fair) notFound();

  const f = fair as Fair;
  const status = (f.status ?? "DRAFT") as FairStatus;
  const pricing = getFairPricing(f);

  let revUSD = 0;
  let revINR = 0;
  let unpaid = 0;
  let confirmed = 0;
  let registered = 0;
  let addonTables = 0;
  let addonReps = 0;
  let addonUSD = 0;
  for (const r of (regs as RawRegistrationsAgg[] | null) ?? []) {
    const pay = r.payments?.find((p) => p.payment_status === "success");
    if (pay) {
      if (pay.currency === "USD") revUSD += Number(pay.amount_paid);
      else if (pay.currency === "INR") revINR += Number(pay.amount_paid);
    }
    if (r.status === "confirmed") confirmed += 1;
    else if (r.status === "registered") registered += 1;
    else if (r.status !== "cancelled") unpaid += 1;
    // Booth add-on accumulators count paid + confirmed regs only.
    if (r.status === "confirmed" || r.status === "paid") {
      addonTables += Number(r.addon_tables || 0);
      addonReps += Number(r.addon_reps || 0);
      addonUSD += Number(r.addon_cost_usd || 0);
    }
  }
  const totalRegs = (regs as unknown[] | null)?.length ?? 0;

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
            <Link href="/" className="text-navy/60 hover:text-navy">
              View Site
            </Link>
            <span className="text-navy/40">|</span>
            <span className="text-navy/70">{userEmail}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-2">
          <Link
            href="/admin/fairs"
            className="text-sm text-navy/55 hover:text-navy"
          >
            &larr; All fairs
          </Link>
        </div>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl font-semibold text-navy">
                {f.name}
              </h1>
              <span className="inline-flex items-center gap-2 rounded-full bg-navy/[0.04] px-3 py-1 text-sm font-medium text-navy">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_BY_STATUS[status]}`}
                />
                {STATUS_LABELS[status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-navy/65">
              {fairDateLabel(f)} · {f.venue || f.city}
            </p>
            <p className="mt-0.5 text-xs text-navy/50">
              Created {formatDateShort(f.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/fairs/${f.id}/edit`}
              className="inline-flex items-center gap-2 rounded-md border border-navy/15 bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-cream"
            >
              Edit details
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-navy/15 bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-cream"
            >
              Preview public page ↗
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <Stat label="Registrations" value={totalRegs.toString()} />
          <Stat
            label="Confirmed"
            value={confirmed.toString()}
            accent="green"
          />
          <Stat
            label="Revenue"
            value={
              revUSD === 0 && revINR === 0
                ? "—"
                : [
                    revUSD > 0 ? formatUSD(revUSD) : null,
                    revINR > 0 ? formatINR(revINR) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
            }
            accent="navy"
          />
          <Stat
            label="Student Passes"
            value={(passCount ?? 0).toString()}
            accent="navy"
          />
        </div>

        {/* Revenue breakdown (booth add-ons) */}
        {(addonTables > 0 || addonReps > 0) && (
          <div className="mb-8 rounded-lg border border-navy/10 bg-white p-5 shadow-card">
            <p className="text-xs uppercase tracking-wider text-navy/55">
              Booth Add-on Revenue (paid + confirmed)
            </p>
            <div className="mt-3 grid gap-4 text-sm text-navy/85 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/55">
                  Extra tables
                </p>
                <p className="mt-1 font-serif text-xl font-semibold text-navy">
                  {addonTables}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/55">
                  Extra reps
                </p>
                <p className="mt-1 font-serif text-xl font-semibold text-navy">
                  {addonReps}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/55">
                  Add-on revenue (USD)
                </p>
                <p className="mt-1 font-serif text-xl font-semibold text-navy">
                  {formatUSD(addonUSD)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Build summary */}
        <div className="mb-8 rounded-lg border border-navy/10 bg-white p-5 shadow-card">
          <p className="text-xs uppercase tracking-wider text-navy/55">
            Build Summary
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-navy/85 sm:grid-cols-2">
            <li>
              <Check ok={!!f.name} /> Name: {f.name}
            </li>
            <li>
              <Check ok={!!f.venue} /> Venue: {f.venue || "—"}
            </li>
            <li>
              <Check ok={!!(f.fair_date_start && f.fair_date_end)} />
              Dates: {fairDateLabel(f)}
            </li>
            <li>
              <Check ok={!!f.registration_deadline} />
              Registration deadline:{" "}
              {f.registration_deadline
                ? formatDateShort(f.registration_deadline)
                : "—"}
            </li>
            <li>
              <Check ok={pricing.standardUSD > 0} />
              Pricing: {formatUSD(pricing.standardUSD)}
              {pricing.earlybirdUSD
                ? ` (early bird ${formatUSD(pricing.earlybirdUSD)})`
                : ""}
            </li>
            <li>
              <Check ok={true} /> T&amp;C version 2026.1
            </li>
          </ul>
        </div>

        {/* Premium booth status (v14) */}
        {premium && (
          <div className="mb-8 rounded-lg border border-navy/10 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wider text-navy/55">
                Premium Booth Status
              </p>
              <Link
                href={`/admin/fairs/${f.id}/edit`}
                className="text-xs font-medium text-navy/70 hover:text-navy"
              >
                Edit pricing / slots →
              </Link>
            </div>
            <div className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/55">
                  Slots
                </p>
                <p className="mt-1 font-serif text-xl font-semibold text-navy">
                  {premium.slots_taken} / {premium.premium_slots_total} taken
                </p>
                <p
                  className={
                    premium.slots_remaining <= 0
                      ? "text-xs font-medium text-red-600"
                      : "text-xs text-navy/55"
                  }
                >
                  {premium.slots_remaining <= 0
                    ? "Sold out"
                    : `${premium.slots_remaining} remaining`}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/55">
                  Price
                </p>
                <p className="mt-1 font-serif text-xl font-semibold text-navy">
                  {f.price_premium_usd
                    ? formatUSD(Number(f.price_premium_usd))
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/55">
                  Logo deadline
                </p>
                <p className="mt-1 font-serif text-xl font-semibold text-navy">
                  {f.premium_deadline
                    ? formatDateShort(f.premium_deadline)
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Table pool status (v14) */}
        {tables && (
          <div className="mb-8 rounded-lg border border-navy/10 bg-white p-5 shadow-card">
            <p className="text-xs uppercase tracking-wider text-navy/55">
              Table Pool Status
            </p>
            <div className="mt-3 grid gap-4 text-sm text-navy/85 sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/55">
                  Premium tables
                </p>
                <p className="mt-1 font-serif text-xl font-semibold text-navy">
                  {tables.premium_tables_in_use}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/55">
                  Standard base
                </p>
                <p className="mt-1 font-serif text-xl font-semibold text-navy">
                  {tables.standard_base_tables}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/55">
                  Add-ons taken
                </p>
                <p
                  className={
                    tables.addon_tables_taken >= tables.addon_tables_pool
                      ? "mt-1 font-serif text-xl font-semibold text-red-600"
                      : "mt-1 font-serif text-xl font-semibold text-navy"
                  }
                >
                  {tables.addon_tables_taken} / {tables.addon_tables_pool}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/55">
                  Total in use
                </p>
                <p className="mt-1 font-serif text-xl font-semibold text-navy">
                  {tables.total_tables_in_use}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Itinerary summary */}
        <div className="mb-8 rounded-lg border border-navy/10 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-navy/55">
              Itinerary
            </p>
            <Link
              href={`/admin/fairs/${f.id}/edit#itinerary`}
              className="text-xs font-medium text-navy/70 hover:text-navy"
            >
              Edit itinerary →
            </Link>
          </div>

          {itineraryStops.length === 0 ? (
            <p className="mt-3 text-sm text-navy/55">
              No itinerary stops yet.{" "}
              <Link
                href={`/admin/fairs/${f.id}/edit#itinerary`}
                className="font-medium text-navy underline"
              >
                Build the itinerary
              </Link>{" "}
              so it appears on the landing page, invoices and the briefing
              email.
            </p>
          ) : (
            <>
              <ul className="mt-3 divide-y divide-navy/5 text-sm">
                {itineraryStops.map((s, i) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
                  >
                    <span className="w-28 shrink-0 text-xs text-navy/55">
                      Day {i + 1} · {formatDateShort(s.event_date)}
                    </span>
                    <span className="flex-1 text-navy/85">
                      {s.institution_name ?? s.venue_name ?? "—"}
                      {!s.is_public && (
                        <span className="ml-2 text-xs text-navy/45">
                          (hidden)
                        </span>
                      )}
                    </span>
                    {s.is_main_fair && (
                      <span className="text-xs font-semibold text-gold-500">
                        ★ Main
                      </span>
                    )}
                    <span
                      className={
                        s.is_confirmed
                          ? "text-xs font-medium text-emerald-600"
                          : "text-xs font-medium text-amber-600"
                      }
                    >
                      {s.is_confirmed ? "✅ Confirmed" : "⏳ TBC"}
                    </span>
                  </li>
                ))}
              </ul>
              {unconfirmedPublic > 0 && (
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  ⚠️ {unconfirmedPublic} public stop
                  {unconfirmedPublic === 1 ? "" : "s"} still unconfirmed —
                  update before announcing.
                </p>
              )}
            </>
          )}
        </div>

        {/* Payment gateway toggle (Step 2.5) */}
        <div className="mb-6">
          <GatewayToggle
            fairId={f.id}
            active={!!f.payment_gateway_active}
            activatedAt={f.gateway_activated_at ?? null}
            activationNote={f.gateway_activation_note ?? null}
            registeredCount={registered}
          />
        </div>

        {/* Campus-host programme toggle */}
        <div className="mb-6">
          <CampusHostToggle
            fairId={f.id}
            active={!!f.campus_host_requests_active}
            activatedAt={f.campus_host_activated_at ?? null}
            activationNote={f.campus_host_activation_note ?? null}
            requestCount={hostRequestCount ?? 0}
            fairPublished={f.status === "PUBLISHED"}
          />
        </div>

        {/* Communications shortcuts */}
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <ShortcutLink
            href={`/admin/fairs/${f.id}/mailing-list`}
            label="Mailing list"
            sub="Manage recipients"
          />
          <ShortcutLink
            href={`/admin/fairs/${f.id}/announce`}
            label="Announcement"
            sub={f.announced_at ? "Resend / preview" : "Send launch email"}
          />
          <ShortcutLink
            href={`/admin/fairs/${f.id}/reminders`}
            label="Reminders"
            sub="Early bird · deadline · itinerary · payment"
          />
          <ShortcutLink
            href={`/admin/fairs/${f.id}/postfair`}
            label="Post-fair data"
            sub={
              f.postfair_data_sent_at
                ? "Sent — review status"
                : "Send to each university"
            }
          />
        </div>

        {/* Booth-scanner guide — pre-fair email to all universities */}
        <div className="mb-6">
          <SendScannerGuideButton fairId={f.id} fairName={f.name} />
        </div>

        {/* v21 — announce this fair to the standing subscriber audience */}
        <div className="mb-6">
          <AnnounceSubscribersButton fairId={f.id} fairName={f.name} />
        </div>

        {/* Lifecycle action panel */}
        <FairLifecycleActions
          fairId={f.id}
          status={status}
          earlybirdDeadline={f.earlybird_deadline ?? null}
          registrationDeadline={f.registration_deadline}
          fairDateStart={f.fair_date_start ?? f.fair_date}
          fairDateEnd={f.fair_date_end ?? null}
          unpaidCount={unpaid}
          autoConcluded={!!f.auto_concluded}
          concludedAt={f.concluded_at ?? null}
          thankyouSentAt={f.thankyou_emails_sent_at ?? null}
          statUniversities={f.stat_universities_participated ?? null}
          statStudents={f.stat_students_attended ?? null}
        />

        {/* Status history */}
        <div className="mt-10">
          <p className="text-xs uppercase tracking-wider text-navy/55">
            Status History
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
                <tr>
                  <th className="px-4 py-2.5 text-left">When</th>
                  <th className="px-4 py-2.5 text-left">From → To</th>
                  <th className="px-4 py-2.5 text-left">By</th>
                  <th className="px-4 py-2.5 text-left">Note</th>
                </tr>
              </thead>
              <tbody>
                {((log as FairStatusLog[] | null) ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-navy/55"
                    >
                      No status changes yet.
                    </td>
                  </tr>
                )}
                {((log as FairStatusLog[] | null) ?? []).map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-navy/5 align-top"
                  >
                    <td className="px-4 py-2.5 text-xs text-navy/70">
                      {new Date(entry.changed_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-navy/85">
                      {entry.from_status ? STATUS_LABELS[entry.from_status] : "—"}{" "}
                      → <strong>{STATUS_LABELS[entry.to_status]}</strong>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-navy/70">
                      {entry.changed_by}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-navy/65">
                      {entry.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
        <p className="text-xs uppercase tracking-wider text-navy/55">{label}</p>
        <p className="mt-2 font-serif text-2xl font-semibold text-navy">
          {value}
        </p>
      </div>
    </div>
  );
}

function ShortcutLink({
  href,
  label,
  sub,
}: {
  href: string;
  label: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-navy/10 bg-white p-4 shadow-card transition-colors hover:bg-cream"
    >
      <p className="text-sm font-semibold text-navy">{label}</p>
      <p className="mt-0.5 text-xs text-navy/60">{sub}</p>
    </Link>
  );
}

function Check({ ok }: { ok: boolean }) {
  return (
    <span
      className={`mr-1.5 inline-block ${
        ok ? "text-emerald-600" : "text-navy/30"
      }`}
      aria-hidden
    >
      {ok ? "✓" : "○"}
    </span>
  );
}
