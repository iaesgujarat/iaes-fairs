import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { AdminTable } from "@/components/AdminTable";
import { SignOutButton } from "@/components/SignOutButton";
import { formatINR } from "@/lib/utils";
import type { Registration, Invoice, Fair, Payment } from "@/types";

export const dynamic = "force-dynamic";

interface Row extends Registration {
  fair: Pick<Fair, "id" | "name" | "fair_date" | "booth_price_inr">;
  invoices: Pick<Invoice, "id" | "invoice_number" | "total_amount_inr" | "status">[];
  payments: Pick<Payment, "id" | "payment_status" | "amount_paid_inr">[];
}

export default async function AdminDashboardPage() {
  const session = await createClient().auth.getUser();
  const userEmail = session.data.user?.email || "Admin";

  const supabase = createAdminClient();

  const { data: registrations } = await supabase
    .from("registrations")
    .select(
      `*,
       fair:fairs(id, name, fair_date, booth_price_inr),
       invoices(id, invoice_number, total_amount_inr, status),
       payments(id, payment_status, amount_paid_inr)`
    )
    .order("created_at", { ascending: false });

  const rows: Row[] = (registrations as Row[]) || [];

  const stats = rows.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.status === "confirmed") acc.confirmed += 1;
      if (r.status === "pending" || r.status === "invoice_sent") acc.pending += 1;
      const successPayment = r.payments?.find(
        (p) => p.payment_status === "success"
      );
      if (successPayment) acc.revenue += Number(successPayment.amount_paid_inr);
      return acc;
    },
    { total: 0, confirmed: 0, pending: 0, revenue: 0 }
  );

  return (
    <>
      {/* Admin header (distinct from public) */}
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/admin/dashboard" className="flex items-baseline gap-2">
            <span className="font-serif text-xl font-semibold text-navy">
              IAES
            </span>
            <span className="text-xs uppercase tracking-[0.18em] text-gold-500">
              Admin
            </span>
          </Link>
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
              Registrations
            </h1>
            <p className="mt-1 text-sm text-navy/60">
              All university registrations across active fairs.
            </p>
          </div>
          <a
            href="/api/admin/registrations?format=csv"
            className="inline-flex items-center gap-2 rounded-md border border-navy/15 bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-cream"
          >
            Download CSV
          </a>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Registrations" value={stats.total.toString()} />
          <StatCard label="Confirmed" value={stats.confirmed.toString()} accent="green" />
          <StatCard
            label="Pending Payment"
            value={stats.pending.toString()}
            accent="yellow"
          />
          <StatCard label="Total Revenue" value={formatINR(stats.revenue)} accent="navy" />
        </div>

        <AdminTable rows={rows} />
      </main>

      <SiteFooter />
    </>
  );
}

function StatCard({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "green" | "yellow" | "navy";
}) {
  const accentBar: Record<typeof accent, string> = {
    default: "bg-navy/30",
    green: "bg-emerald-500",
    yellow: "bg-amber-400",
    navy: "bg-gold",
  };
  return (
    <div className="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
      <div className={`h-1 ${accentBar[accent]}`} />
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
