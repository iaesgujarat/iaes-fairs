import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

interface SeqRow {
  financial_year: string;
  series_type: "DOMESTIC" | "EXPORT";
  last_number: number;
  updated_at: string;
}

function fyLabel(fy: string): string {
  // '2627' → 'FY 2026-27'
  if (fy.length !== 4) return `FY ${fy}`;
  const start = fy.slice(0, 2);
  const end = fy.slice(2);
  return `FY 20${start}-${end}`;
}

function currentFy(now = new Date()): string {
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const startYear = m <= 3 ? y - 1 : y;
  const endYear = startYear + 1;
  return (
    String(startYear - 2000).padStart(2, "0") +
    String(endYear - 2000).padStart(2, "0")
  );
}

function formatExample(fy: string, series: "DOMESTIC" | "EXPORT", num: number): string {
  const padded = String(num).padStart(3, "0");
  return series === "EXPORT"
    ? `IAES-FAIR-${fy}-EXP-${padded}`
    : `IAES-FAIR-${fy}-${padded}`;
}

export default async function SequencesPage() {
  const session = await createClient().auth.getUser();
  const userEmail = session.data.user?.email || "Admin";

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("invoice_sequences")
    .select("*")
    .order("financial_year", { ascending: false })
    .order("series_type", { ascending: true });

  const all = (rows as SeqRow[] | null) || [];
  const fy = currentFy();

  // Group by FY
  const byFy = new Map<string, SeqRow[]>();
  for (const r of all) {
    const arr = byFy.get(r.financial_year) ?? [];
    arr.push(r);
    byFy.set(r.financial_year, arr);
  }

  // Always show the current FY at the top even if no rows yet
  if (!byFy.has(fy)) byFy.set(fy, []);

  const currentRows = byFy.get(fy) || [];
  const archivedFys = Array.from(byFy.keys()).filter((k) => k !== fy);

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
              <Link
                href="/admin/subscribers"
                className="text-navy/65 hover:text-navy"
              >
                Subscribers
              </Link>
              <Link
                href="/admin/feedback"
                className="text-navy/65 hover:text-navy"
              >
                Feedback
              </Link>
              <Link
                href="/admin/sequences"
                className="font-medium text-navy underline-offset-4"
              >
                Invoice sequences
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-navy/70">{userEmail}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-navy">
            Invoice Sequences
          </h1>
          <p className="mt-1 text-sm text-navy/60">
            Two parallel series under one table. Both reset on April 1.
            Domestic = INR registrations (GST charged). Export = USD
            registrations (zero-rated under GST law).
          </p>
        </div>

        {/* Current FY */}
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl font-semibold text-navy">
              {fyLabel(fy)}{" "}
              <span className="ml-2 inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                Active
              </span>
            </h2>
          </div>
          <FyTable fy={fy} rows={currentRows} />
        </section>

        {/* Archived FYs */}
        {archivedFys.map((archivedFy) => (
          <section key={archivedFy} className="mb-8">
            <h2 className="mb-3 font-serif text-lg font-medium text-navy/75">
              {fyLabel(archivedFy)}{" "}
              <span className="ml-2 text-xs uppercase tracking-wider text-navy/45">
                Archived
              </span>
            </h2>
            <FyTable fy={archivedFy} rows={byFy.get(archivedFy) || []} archived />
          </section>
        ))}

        <div className="mt-10 rounded-md border border-navy/10 bg-cream/40 p-5 text-sm text-navy/75">
          <p className="font-semibold text-navy">GST notes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            <li>
              GST Rule 46 permits multiple invoice series as long as each is
              sequential within itself.
            </li>
            <li>
              Domestic (INR) invoices appear in GSTR-1 Table 4/7 (B2B/B2C).
            </li>
            <li>
              Export (USD) invoices appear in GSTR-1 Table 6A (exports of
              service / zero-rated).
            </li>
            <li>
              The series_type is derived from{" "}
              <code className="rounded bg-white px-1">
                invoices.payment_currency
              </code>{" "}
              at TAX-invoice generation time — proformas do not consume a slot.
            </li>
          </ul>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function FyTable({
  fy,
  rows,
  archived,
}: {
  fy: string;
  rows: SeqRow[];
  archived?: boolean;
}) {
  const domestic = rows.find((r) => r.series_type === "DOMESTIC");
  const export_ = rows.find((r) => r.series_type === "EXPORT");

  return (
    <div className="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
          <tr>
            <Th>Series</Th>
            <Th>Last invoice number</Th>
            <Th>Total issued</Th>
            <Th>Updated</Th>
          </tr>
        </thead>
        <tbody>
          <SeriesRow
            label="Domestic (INR)"
            sublabel="Taxable supply — GST charged"
            fy={fy}
            series="DOMESTIC"
            row={domestic}
            archived={archived}
          />
          <SeriesRow
            label="Export (USD)"
            sublabel="Zero-rated export of service"
            fy={fy}
            series="EXPORT"
            row={export_}
            archived={archived}
          />
        </tbody>
      </table>
    </div>
  );
}

function SeriesRow({
  label,
  sublabel,
  fy,
  series,
  row,
  archived,
}: {
  label: string;
  sublabel: string;
  fy: string;
  series: "DOMESTIC" | "EXPORT";
  row: SeqRow | undefined;
  archived?: boolean;
}) {
  const issued = row?.last_number ?? 0;
  const last = issued > 0 ? formatExample(fy, series, issued) : null;
  const next = formatExample(fy, series, issued + 1);
  return (
    <tr className="border-t border-navy/5 align-top">
      <td className="px-4 py-3">
        <div className="font-medium text-navy">{label}</div>
        <div className="text-xs text-navy/55">{sublabel}</div>
      </td>
      <td className="px-4 py-3">
        {last ? (
          <>
            <div className="font-mono text-navy">{last}</div>
            {!archived && (
              <div className="text-[10px] uppercase tracking-wider text-navy/45">
                Next: {next}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-navy/45">No invoices yet</div>
            {!archived && (
              <div className="text-[10px] uppercase tracking-wider text-navy/45">
                First: {next}
              </div>
            )}
          </>
        )}
      </td>
      <td className="px-4 py-3 font-medium text-navy">{issued}</td>
      <td className="px-4 py-3 text-xs text-navy/55">
        {row?.updated_at
          ? new Date(row.updated_at).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—"}
      </td>
    </tr>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-left">{children}</th>;
}
