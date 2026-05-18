import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { AdminTable } from "@/components/AdminTable";
import { InstitutionAdminTable } from "@/components/InstitutionAdminTable";
import { FairDayTab } from "@/components/FairDayTab";
import { SignOutButton } from "@/components/SignOutButton";
import { formatINR, formatUSD } from "@/lib/utils";
import type {
  Registration,
  Invoice,
  Fair,
  Payment,
  InstitutionRegistration,
  WaitlistSignup,
} from "@/types";

export const dynamic = "force-dynamic";

interface UniRow extends Registration {
  fair: Pick<Fair, "id" | "name" | "fair_date">;
  invoices: Pick<
    Invoice,
    | "id"
    | "invoice_number"
    | "payment_currency"
    | "total_amount_inr"
    | "total_amount_usd"
    | "gst_type"
    | "cgst_amount"
    | "sgst_amount"
    | "igst_amount"
    | "status"
  >[];
  payments: Pick<
    Payment,
    "id" | "payment_status" | "amount_paid" | "currency"
  >[];
}

interface InstRow extends InstitutionRegistration {
  fair: Pick<Fair, "id" | "name" | "fair_date">;
}

type Tab = "university" | "institution" | "fairday" | "waitlist";

function resolveTab(value?: string): Tab {
  if (value === "institution") return "institution";
  if (value === "fairday") return "fairday";
  if (value === "waitlist") return "waitlist";
  return "university";
}

/** Waitlist count — 0 if the table isn't migrated yet (never throws). */
async function getWaitlistCount(): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("waitlist_signups")
      .select("*", { count: "exact", head: true });
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const tab: Tab = resolveTab(searchParams?.tab);

  const session = await createClient().auth.getUser();
  const userEmail = session.data.user?.email || "Admin";

  // The Waitlist tab only appears once signups exist (no empty clutter),
  // but a direct ?tab=waitlist link still resolves so it's never trapped.
  const waitlistCount = await getWaitlistCount();
  const showWaitlistTab = waitlistCount > 0 || tab === "waitlist";

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
                className="font-medium text-navy underline-offset-4"
              >
                Registrations
              </Link>
              <Link
                href="/admin/fairs"
                className="text-navy/65 hover:text-navy"
              >
                Fairs
              </Link>
              <Link
                href="/admin/sequences"
                className="text-navy/65 hover:text-navy"
              >
                Invoice sequences
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
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-semibold text-navy">
            Registrations
          </h1>
          <p className="mt-1 text-sm text-navy/60">
            University and institution registrations across active fairs.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex flex-wrap items-center gap-1 border-b border-navy/10">
          <TabLink href="/admin/dashboard?tab=university" active={tab === "university"}>
            University Registrations
          </TabLink>
          <TabLink href="/admin/dashboard?tab=institution" active={tab === "institution"}>
            Institution Registrations
          </TabLink>
          <TabLink href="/admin/dashboard?tab=fairday" active={tab === "fairday"}>
            Fair Day
          </TabLink>
          {showWaitlistTab && (
            <TabLink
              href="/admin/dashboard?tab=waitlist"
              active={tab === "waitlist"}
            >
              Waitlist
            </TabLink>
          )}
        </div>

        {tab === "university" && <UniversityTab />}
        {tab === "institution" && <InstitutionTab />}
        {tab === "fairday" && <FairDayWrapper />}
        {tab === "waitlist" && <WaitlistTab />}
      </main>

      <SiteFooter />
    </>
  );
}

// ----------------------------------------------------------------
// University tab
// ----------------------------------------------------------------
async function UniversityTab() {
  const supabase = createAdminClient();
  const { data: registrations } = await supabase
    .from("registrations")
    .select(
      `*,
       fair:fairs(id, name, fair_date),
       invoices(id, invoice_number, payment_currency, total_amount_inr, total_amount_usd, gst_type, cgst_amount, sgst_amount, igst_amount, status),
       payments(id, payment_status, amount_paid, currency)`
    )
    .order("created_at", { ascending: false });

  const rows: UniRow[] = (registrations as UniRow[]) || [];

  const stats = rows.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.status === "confirmed") acc.confirmed += 1;
      if (r.status === "pending" || r.status === "invoice_sent")
        acc.pending += 1;

      const successPayment = r.payments?.find(
        (p) => p.payment_status === "success"
      );
      if (successPayment) {
        if (successPayment.currency === "INR")
          acc.revenueINR += Number(successPayment.amount_paid);
        else if (successPayment.currency === "USD")
          acc.revenueUSD += Number(successPayment.amount_paid);
      }

      const invoice = r.invoices?.[0];
      if (invoice && invoice.status === "paid") {
        acc.gstCGST += Number(invoice.cgst_amount || 0);
        acc.gstSGST += Number(invoice.sgst_amount || 0);
        acc.gstIGST += Number(invoice.igst_amount || 0);
      }
      return acc;
    },
    {
      total: 0,
      confirmed: 0,
      pending: 0,
      revenueINR: 0,
      revenueUSD: 0,
      gstCGST: 0,
      gstSGST: 0,
      gstIGST: 0,
    }
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-end">
        <a
          href="/api/admin/registrations?format=csv"
          className="inline-flex items-center gap-2 rounded-md border border-navy/15 bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-cream"
        >
          Download CSV
        </a>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Registrations" value={stats.total.toString()} />
        <StatCard
          label="Confirmed"
          value={stats.confirmed.toString()}
          accent="green"
        />
        <StatCard
          label="Pending Payment"
          value={stats.pending.toString()}
          accent="yellow"
        />
        <StatCard
          label="Revenue (INR)"
          value={formatINR(stats.revenueINR)}
          accent="navy"
        />
        <StatCard
          label="Revenue (USD)"
          value={formatUSD(stats.revenueUSD)}
          accent="navy"
        />
      </div>

      <div className="mb-8 rounded-lg border border-navy/10 bg-white shadow-card">
        <div className="border-b border-navy/10 px-5 py-3">
          <p className="text-xs uppercase tracking-wider text-navy/55">
            GST Report (paid invoices)
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <GstStat label="CGST collected" value={stats.gstCGST} />
          <GstStat label="SGST collected" value={stats.gstSGST} />
          <GstStat label="IGST collected" value={stats.gstIGST} />
        </div>
      </div>

      <AdminTable rows={rows} />
    </>
  );
}

// ----------------------------------------------------------------
// Fair Day tab — passes issued, check-ins, scans per university
// ----------------------------------------------------------------
async function FairDayWrapper() {
  const supabase = createAdminClient();

  const [{ data: passes }, { data: scans }, { data: universities }] =
    await Promise.all([
      supabase
        .from("fair_student_passes")
        .select(
          `id, pass_uuid, pass_number, full_name, email, phone,
           institution_name, current_course, current_semester,
           checked_in, checked_in_at, data_sharing_consent,
           whatsapp_consent, email_consent, created_at`
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("fair_scans")
        .select(
          `pass_uuid, university_registration_id, interested, scanned_at`
        )
        .order("scanned_at", { ascending: false }),
      supabase
        .from("registrations")
        .select(`id, university_name`)
        .in("status", ["paid", "confirmed", "invoice_sent"]),
    ]);

  return (
    <FairDayTab
      passes={passes || []}
      scans={scans || []}
      universities={universities || []}
    />
  );
}

// ----------------------------------------------------------------
// Institution tab
// ----------------------------------------------------------------
async function InstitutionTab() {
  const supabase = createAdminClient();
  const { data: institutions } = await supabase
    .from("institution_registrations")
    .select(`*, fair:fairs(id, name, fair_date)`)
    .order("created_at", { ascending: false });

  const rows: InstRow[] = (institutions as InstRow[]) || [];

  const totalStudents = rows.reduce(
    (sum, r) => sum + Number(r.expected_student_count || 0),
    0
  );

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Institutions Registered"
          value={rows.length.toString()}
        />
        <StatCard
          label="Total Expected Students"
          value={totalStudents.toLocaleString("en-IN")}
          accent="navy"
        />
        <StatCard
          label="Confirmed"
          value={rows.filter((r) => r.status === "confirmed").length.toString()}
          accent="green"
        />
        <StatCard
          label="Registered (Awaiting)"
          value={rows.filter((r) => r.status === "registered").length.toString()}
          accent="yellow"
        />
      </div>

      <InstitutionAdminTable rows={rows} />
    </>
  );
}

// ----------------------------------------------------------------
// Waitlist tab — between-fairs signups (auto-merged to mailing list)
// ----------------------------------------------------------------
async function WaitlistTab() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("waitlist_signups")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (data as WaitlistSignup[] | null) ?? [];

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-navy/15 bg-white p-10 text-center text-sm text-navy/55">
        No waitlist signups yet. This tab appears when universities sign up
        between fairs.
      </div>
    );
  }

  const mergedCount = rows.filter((r) => r.merged_to_recipients).length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-navy/70">
          <strong>{rows.length}</strong> signup
          {rows.length === 1 ? "" : "s"} ·{" "}
          {mergedCount === rows.length ? (
            <span className="text-emerald-600">
              all merged to mailing list ✅
            </span>
          ) : (
            <span className="text-amber-600">
              {mergedCount}/{rows.length} merged to mailing list
            </span>
          )}
        </p>
        <a
          href="/api/admin/waitlist?format=csv"
          className="inline-flex items-center gap-2 rounded-md border border-navy/15 bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-cream"
        >
          Download CSV
        </a>
      </div>

      <div className="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
            <tr>
              <th className="px-4 py-2.5 text-left">University</th>
              <th className="px-4 py-2.5 text-left">Contact</th>
              <th className="px-4 py-2.5 text-left">Email</th>
              <th className="px-4 py-2.5 text-left">Country</th>
              <th className="px-4 py-2.5 text-left">Signed Up</th>
              <th className="px-4 py-2.5 text-left">Merged</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-navy/5">
                <td className="px-4 py-2.5 font-medium text-navy">
                  {r.university_name}
                </td>
                <td className="px-4 py-2.5 text-navy/75">
                  {r.contact_name || "—"}
                </td>
                <td className="px-4 py-2.5 text-navy/75">{r.email}</td>
                <td className="px-4 py-2.5 text-navy/75">{r.country}</td>
                <td className="px-4 py-2.5 text-xs text-navy/65">
                  {new Date(r.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-2.5">
                  {r.merged_to_recipients ? (
                    <span className="text-emerald-600">✓</span>
                  ) : (
                    <span className="text-amber-500">pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ----------------------------------------------------------------
// UI bits
// ----------------------------------------------------------------
function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "border-b-2 border-navy px-4 py-2.5 text-sm font-semibold text-navy"
          : "border-b-2 border-transparent px-4 py-2.5 text-sm text-navy/60 hover:text-navy"
      }
    >
      {children}
    </Link>
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

function GstStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-navy/55">{label}</p>
      <p className="mt-1 font-serif text-xl font-semibold text-navy">
        {formatINR(value)}
      </p>
    </div>
  );
}
