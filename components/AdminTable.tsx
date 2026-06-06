"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { formatINR, formatUSD, formatDateShort } from "@/lib/utils";
import type {
  Registration,
  Fair,
  Invoice,
  Payment,
  RegistrationStatus,
} from "@/types";

function formatAcceptedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
}

interface Row extends Registration {
  fair: Pick<Fair, "id" | "name" | "fair_date">;
  invoices: Pick<
    Invoice,
    | "id"
    | "invoice_number"
    | "payment_currency"
    | "total_amount_inr"
    | "total_amount_usd"
    | "gst_type"
    | "status"
  >[];
  payments: Pick<
    Payment,
    "id" | "payment_status" | "amount_paid" | "currency"
  >[];
}

const ALL_STATUSES: (RegistrationStatus | "all")[] = [
  "all",
  "registered",
  "payment_open",
  "soft_confirmed",
  "paid",
  "confirmed",
  "cancelled",
];

function formatInvoiceTotal(invoice: Row["invoices"][number] | undefined): string {
  if (!invoice) return "—";
  if (invoice.payment_currency === "INR") {
    return formatINR(Number(invoice.total_amount_inr || 0));
  }
  return formatUSD(Number(invoice.total_amount_usd || 0));
}

export function AdminTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    RegistrationStatus | "all"
  >("all");
  const [tierFilter, setTierFilter] = useState<
    "all" | "EARLYBIRD" | "STANDARD" | "PREMIUM" | "LOGO_PENDING"
  >("all");
  const [currencyFilter, setCurrencyFilter] = useState<"all" | "USD" | "INR">(
    "all"
  );
  const [updating, setUpdating] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<Row | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (currencyFilter !== "all" && r.payment_currency !== currencyFilter)
        return false;
      if (tierFilter !== "all") {
        if (tierFilter === "LOGO_PENDING") {
          if (!(r.pricing_tier === "PREMIUM" && !r.backdrop_received))
            return false;
        } else if (r.pricing_tier !== tierFilter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        r.university_name.toLowerCase().includes(q) ||
        r.contact_name.toLowerCase().includes(q) ||
        r.contact_email.toLowerCase().includes(q) ||
        (r.invoices?.[0]?.invoice_number || "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter, tierFilter, currencyFilter]);

  // Soft confirm — acknowledge/hold a spot before payment.
  async function softConfirm(registrationId: string) {
    setUpdating(registrationId);
    try {
      const res = await fetch(
        `/api/admin/registrations/${registrationId}/soft-confirm`,
        { method: "POST" }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Soft confirm failed");
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not soft-confirm");
    } finally {
      setUpdating(null);
    }
  }

  async function sendReminder(registrationId: string) {
    setUpdating(registrationId);
    try {
      const res = await fetch(
        `/api/admin/registrations/${registrationId}/remind`,
        { method: "POST" }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Reminder failed");
      alert("Reminder email sent.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not send reminder");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="rounded-lg border border-navy/10 bg-white shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-navy/10 p-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
          <Input
            placeholder="Search university, contact, invoice..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="rounded-md border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/30"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as RegistrationStatus | "all")
          }
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/30"
          value={tierFilter}
          onChange={(e) =>
            setTierFilter(
              e.target.value as
                | "all"
                | "EARLYBIRD"
                | "STANDARD"
                | "PREMIUM"
                | "LOGO_PENDING"
            )
          }
        >
          <option value="all">All tiers</option>
          <option value="EARLYBIRD">Early Bird</option>
          <option value="STANDARD">Standard</option>
          <option value="PREMIUM">Premium</option>
          <option value="LOGO_PENDING">⏳ Logo pending</option>
        </select>
        <select
          className="rounded-md border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/30"
          value={currencyFilter}
          onChange={(e) =>
            setCurrencyFilter(e.target.value as "all" | "USD" | "INR")
          }
        >
          <option value="all">All currencies</option>
          <option value="USD">USD ($)</option>
          <option value="INR">INR (₹)</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
            <tr>
              <Th>University</Th>
              <Th>Contact</Th>
              <Th>Fair</Th>
              <Th>Booth</Th>
              <Th>Currency</Th>
              <Th>Amount</Th>
              <Th>GST</Th>
              <Th>Status</Th>
              <Th>T&amp;C</Th>
              <Th>Registered</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-10 text-center text-sm text-navy/50"
                >
                  No registrations match the current filter.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const invoice = r.invoices?.[0];
              const successPayment = r.payments?.find(
                (p) => p.payment_status === "success"
              );
              return (
                <tr
                  key={r.id}
                  className="border-t border-navy/5 align-top hover:bg-cream/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-navy">
                      {r.university_name}
                    </div>
                    <div className="text-xs text-navy/50">
                      {r.university_country}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-navy">{r.contact_name}</div>
                    <div className="text-xs text-navy/55">{r.contact_email}</div>
                    {r.contact_phone && (
                      <div className="text-xs text-navy/40">
                        {r.contact_phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-navy/90">{r.fair?.name}</div>
                    <div className="text-xs text-navy/50">
                      {r.fair?.fair_date
                        ? formatDateShort(r.fair.fair_date)
                        : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-navy/90">
                      {r.total_tables ?? 1} table
                      {(r.total_tables ?? 1) === 1 ? "" : "s"} ·{" "}
                      {r.total_reps ?? r.number_of_reps} rep
                      {(r.total_reps ?? r.number_of_reps) === 1 ? "" : "s"}
                    </div>
                    {Number(r.addon_cost_usd || 0) > 0 ? (
                      <div className="text-xs text-gold-600">
                        +USD {Number(r.addon_cost_usd).toLocaleString()} add-ons
                      </div>
                    ) : (
                      <div className="text-xs text-navy/45">Base only</div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={
                          r.pricing_tier === "PREMIUM"
                            ? "rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-navy"
                            : "rounded-full bg-navy/10 px-1.5 py-0.5 text-[10px] font-semibold text-navy/70"
                        }
                      >
                        {r.pricing_tier === "PREMIUM"
                          ? "💎 PREMIUM"
                          : r.pricing_tier === "EARLYBIRD"
                          ? "EARLY BIRD"
                          : "STANDARD"}
                      </span>
                      {r.pricing_tier === "PREMIUM" &&
                        (r.backdrop_received ? (
                          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                            logo ✓
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                            logo ⏳
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-navy/70">
                    {r.payment_currency}
                  </td>
                  <td className="px-4 py-3">
                    {invoice ? (
                      <>
                        <div className="font-medium text-navy">
                          {formatInvoiceTotal(invoice)}
                        </div>
                        <div className="text-xs text-navy/50">
                          {invoice.invoice_number}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-navy/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-navy/65">
                    {invoice?.gst_type === "CGST_SGST"
                      ? "CGST+SGST"
                      : invoice?.gst_type === "IGST"
                      ? "IGST"
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                    {successPayment && (
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-emerald-700">
                        paid
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.terms_accepted ? (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
                          ✓ Yes
                        </span>
                        <div className="mt-1 text-[10px] text-navy/55">
                          {formatAcceptedAt(r.terms_accepted_at)}
                        </div>
                        {r.terms_version && (
                          <div className="text-[10px] text-navy/40">
                            v{r.terms_version}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                        ⚠ Not recorded
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-navy/65">
                    {formatDateShort(r.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/invoice/${r.id}`}>
                        <Button size="sm" variant="outline">
                          Invoice
                        </Button>
                      </Link>
                      <Link href={`/admin/registrations/${r.id}`}>
                        <Button size="sm" variant="outline">
                          Manage
                        </Button>
                      </Link>
                      {r.status !== "soft_confirmed" &&
                        r.status !== "paid" &&
                        r.status !== "confirmed" &&
                        r.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={updating === r.id}
                            onClick={() => softConfirm(r.id)}
                          >
                            Soft confirm
                          </Button>
                        )}
                      {r.status !== "paid" &&
                        r.status !== "confirmed" &&
                        r.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="gold"
                            onClick={() => setPayFor(r)}
                          >
                            Mark as paid
                          </Button>
                        )}
                      {r.status === "invoice_sent" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={updating === r.id}
                          onClick={() => sendReminder(r.id)}
                        >
                          Remind
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-navy/10 px-4 py-3 text-xs text-navy/55">
        Showing {filtered.length} of {rows.length} registrations
      </div>

      {payFor && (
        <MarkPaidModal row={payFor} onClose={() => setPayFor(null)} />
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left">{children}</th>;
}

// ----------------------------------------------------------------
// Hard-confirm: capture the received payment (matches our books +
// powers the post-fair Finance MIS), then finalize → TAX invoice +
// confirmation email + WhatsApp via /confirm-payment.
// ----------------------------------------------------------------
const round2 = (n: number) => Math.round(n * 100) / 100;

function MarkPaidModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const invoice = row.invoices?.[0];
  const isINR = row.payment_currency === "INR";
  const defaultTotal = isINR
    ? invoice?.total_amount_inr
    : invoice?.total_amount_usd;

  const [form, setForm] = useState({
    invoice_total: defaultTotal ? String(defaultTotal) : "",
    gst_type: (invoice?.gst_type === "CGST_SGST"
      ? "CGST_SGST"
      : "IGST") as "IGST" | "CGST_SGST",
    bank_credit_date: "",
    amount_credited_inr: isINR && defaultTotal ? String(defaultTotal) : "",
    payment_method: "Bank transfer",
    reference_number: "",
    remitter_name: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Live GST back-out preview (INR only) so the admin sees exactly what
  // the tax invoice will say before confirming.
  const total = Number(form.invoice_total);
  const breakdown =
    isINR && Number.isFinite(total) && total > 0
      ? (() => {
          const gst = round2((total * 18) / 118);
          const basic = round2(total - gst);
          if (form.gst_type === "CGST_SGST") {
            const cgst = round2(gst / 2);
            return { basic, lines: [
              ["CGST 9%", round2(cgst)],
              ["SGST 9%", round2(gst - cgst)],
            ] as [string, number][] };
          }
          return { basic, lines: [["IGST 18%", gst]] as [string, number][] };
        })()
      : null;

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/registrations/${row.id}/confirm-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_total: form.invoice_total,
            gst_type: form.gst_type,
            bank_credit_date: form.bank_credit_date,
            amount_credited_inr: form.amount_credited_inr,
            payment_method: form.payment_method,
            reference_number: form.reference_number,
            remitter_name: form.remitter_name,
            notes: form.notes,
          }),
        }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Could not confirm payment");
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not confirm payment");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
      <div className="w-full max-w-lg rounded-lg border border-navy/10 bg-white shadow-xl">
        <div className="border-b border-navy/10 px-5 py-4">
          <p className="text-sm font-semibold text-navy">
            Record payment — {row.university_name}
          </p>
          <p className="mt-0.5 text-xs text-navy/55">
            Enter the amount actually agreed/received. This issues the tax
            invoice <strong>for that amount</strong>, confirms the booking, and
            emails the rep.{" "}
            {isINR
              ? "GST is backed out of the inclusive total."
              : "USD export — no GST."}
          </p>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              type="number"
              label={
                isINR
                  ? "Invoice total, incl. GST (INR) *"
                  : "Invoice total (USD) *"
              }
              placeholder={isINR ? "e.g. 118000" : "e.g. 1500"}
              value={form.invoice_total}
              onChange={(e) => set("invoice_total")(e.target.value)}
            />
            {isINR && (
              <div>
                <label className="mb-1 block text-sm font-medium text-navy">
                  GST type *
                </label>
                <select
                  className="w-full rounded-md border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/30"
                  value={form.gst_type}
                  onChange={(e) => set("gst_type")(e.target.value)}
                >
                  <option value="IGST">Inter-state — IGST 18%</option>
                  <option value="CGST_SGST">
                    Intra-Gujarat — CGST 9% + SGST 9%
                  </option>
                </select>
              </div>
            )}
          </div>

          {breakdown && (
            <div className="mt-3 rounded-md border border-navy/10 bg-cream/50 p-3 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-navy/60">Taxable (basic)</span>
                <span className="font-medium text-navy">
                  {formatINR(breakdown.basic)}
                </span>
              </div>
              {breakdown.lines.map(([label, amt]) => (
                <div key={label} className="flex justify-between py-0.5">
                  <span className="text-navy/60">{label}</span>
                  <span className="font-medium text-navy">{formatINR(amt)}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-navy/10 pt-1">
                <span className="font-semibold text-navy">Invoice total</span>
                <span className="font-semibold text-navy">
                  {formatINR(total)}
                </span>
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              type="date"
              label="Bank credit date *"
              value={form.bank_credit_date}
              onChange={(e) => set("bank_credit_date")(e.target.value)}
            />
            <Input
              type="number"
              label="Amount actually credited to bank (INR) *"
              placeholder="e.g. 124500"
              value={form.amount_credited_inr}
              onChange={(e) => set("amount_credited_inr")(e.target.value)}
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-navy">
                Payment method *
              </label>
              <select
                className="w-full rounded-md border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/30"
                value={form.payment_method}
                onChange={(e) => set("payment_method")(e.target.value)}
              >
                <option>Bank transfer</option>
                <option>Wire / SWIFT</option>
                <option>NEFT / RTGS / IMPS</option>
                <option>Cheque</option>
                <option>Cash</option>
                <option>Other</option>
              </select>
            </div>
            <Input
              label="Reference / UTR"
              placeholder="optional"
              value={form.reference_number}
              onChange={(e) => set("reference_number")(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <Input
              label="Remitter name"
              placeholder="optional — who actually paid"
              value={form.remitter_name}
              onChange={(e) => set("remitter_name")(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <Textarea
              label="Notes"
              placeholder="optional — anything for reconciliation"
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
            />
          </div>
          {err && <p className="mt-3 text-xs text-red-600">{err}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-navy/10 px-5 py-4">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" variant="gold" loading={busy} onClick={submit}>
            Confirm payment received
          </Button>
        </div>
      </div>
    </div>
  );
}
