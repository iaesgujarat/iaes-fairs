import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SignOutButton } from "@/components/SignOutButton";
import { formatDateShort, formatUSD } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/fairStatus";
import type { Fair, FairStatus } from "@/types";

export const dynamic = "force-dynamic";

interface FairWithCounts extends Fair {
  registrations_count: number;
  paid_revenue_usd: number;
  paid_revenue_inr: number;
}

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
      { month: "short", year: "numeric" }
    )}`;
  }
  return `${formatDateShort(start)} – ${formatDateShort(end)}`;
}

interface RawRegistrationsAgg {
  fair_id: string;
  status: string;
  payments?: { payment_status: string; amount_paid: number; currency: string }[];
}

export default async function AdminFairsListPage() {
  const session = await createClient().auth.getUser();
  const userEmail = session.data.user?.email || "Admin";

  const supabase = createAdminClient();
  const [{ data: fairs }, { data: regs }] = await Promise.all([
    supabase
      .from("fairs")
      .select("*")
      .order("fair_date", { ascending: false }),
    supabase
      .from("registrations")
      .select(
        `fair_id, status, payments(payment_status, amount_paid, currency)`
      ),
  ]);

  const byFair = new Map<
    string,
    { count: number; usd: number; inr: number }
  >();
  for (const r of (regs as RawRegistrationsAgg[] | null) ?? []) {
    const agg = byFair.get(r.fair_id) ?? { count: 0, usd: 0, inr: 0 };
    agg.count += 1;
    const pay = r.payments?.find((p) => p.payment_status === "success");
    if (pay) {
      if (pay.currency === "USD") agg.usd += Number(pay.amount_paid);
      else if (pay.currency === "INR") agg.inr += Number(pay.amount_paid);
    }
    byFair.set(r.fair_id, agg);
  }

  const rows: FairWithCounts[] = ((fairs as Fair[] | null) ?? []).map((f) => {
    const agg = byFair.get(f.id) ?? { count: 0, usd: 0, inr: 0 };
    return {
      ...f,
      registrations_count: agg.count,
      paid_revenue_usd: agg.usd,
      paid_revenue_inr: agg.inr,
    };
  });

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
                className="font-medium text-navy underline-offset-4"
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

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-navy">
              Fairs
            </h1>
            <p className="mt-1 text-sm text-navy/60">
              Manage the full lifecycle of every IAES fair.
            </p>
          </div>
          <Link
            href="/admin/fairs/new"
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-navy/90"
          >
            + Create Fair
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
              <tr>
                <Th>Fair Name</Th>
                <Th>Dates</Th>
                <Th>Status</Th>
                <Th>Registered</Th>
                <Th>Paid Revenue</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-navy/55"
                  >
                    No fairs yet.{" "}
                    <Link
                      href="/admin/fairs/new"
                      className="text-navy underline"
                    >
                      Create one →
                    </Link>
                  </td>
                </tr>
              )}
              {rows.map((f) => (
                <tr
                  key={f.id}
                  className="border-t border-navy/5 align-top hover:bg-cream/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-navy">{f.name}</div>
                    <div className="text-xs text-navy/55">
                      {f.venue || f.city}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-navy/85">
                    {fairDateLabel(f)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={f.status ?? "DRAFT"} />
                  </td>
                  <td className="px-4 py-3 font-medium text-navy">
                    {f.registrations_count}
                  </td>
                  <td className="px-4 py-3 text-xs text-navy/85">
                    {f.paid_revenue_usd > 0 && (
                      <div>{formatUSD(f.paid_revenue_usd)}</div>
                    )}
                    {f.paid_revenue_inr > 0 && (
                      <div className="text-navy/65">
                        ₹
                        {new Intl.NumberFormat("en-IN").format(
                          f.paid_revenue_inr
                        )}
                      </div>
                    )}
                    {f.paid_revenue_usd === 0 && f.paid_revenue_inr === 0 && (
                      <span className="text-navy/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/fairs/${f.id}`}
                      className="text-sm text-navy hover:underline"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-left">{children}</th>;
}

const DOT_BY_STATUS: Record<FairStatus, string> = {
  DRAFT: "bg-gray-400",
  PUBLISHED: "bg-blue-500",
  REGISTRATION_CLOSED: "bg-amber-400",
  ONGOING: "bg-emerald-500 animate-pulse",
  COMPLETED: "bg-teal-500",
  ARCHIVED: "bg-gray-400",
  CANCELLED: "bg-red-500",
};

function StatusPill({ status }: { status: FairStatus }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-navy/[0.04] px-2.5 py-0.5 text-xs font-medium text-navy">
      <span
        className={`inline-block h-2 w-2 rounded-full ${DOT_BY_STATUS[status]}`}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
