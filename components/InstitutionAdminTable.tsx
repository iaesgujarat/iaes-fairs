"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { formatDateShort } from "@/lib/utils";
import type {
  Fair,
  InstitutionRegistration,
  InstitutionStatus,
} from "@/types";

interface Row extends InstitutionRegistration {
  fair: Pick<Fair, "id" | "name" | "fair_date">;
}

const STATUSES: (InstitutionStatus | "all")[] = [
  "all",
  "registered",
  "confirmed",
  "cancelled",
];

const STATUS_LABELS: Record<InstitutionStatus, string> = {
  registered: "Registered",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

export function InstitutionAdminTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InstitutionStatus | "all">(
    "all"
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  // Lifecycle transition. Cancel asks for confirmation (destructive);
  // Confirm and Reactivate go straight through. router.refresh() re-runs
  // the server component so the table reflects the new status + stats.
  async function updateStatus(id: string, next: InstitutionStatus) {
    if (savingId) return;
    if (next === "cancelled") {
      const ok = window.confirm(
        "Cancel this institution registration? They'll be excluded from totals. You can reactivate later."
      );
      if (!ok) return;
    }
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/institutions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data?.error ?? "Could not update status.");
        return;
      }
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Network error.");
    } finally {
      setSavingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.institution_name.toLowerCase().includes(q) ||
        r.contact_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.state.toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  return (
    <div className="rounded-lg border border-navy/10 bg-white shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-navy/10 p-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
          <Input
            placeholder="Search institution, contact, city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="rounded-md border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/30"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as InstitutionStatus | "all")
          }
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
            <tr>
              <Th>Institution</Th>
              <Th>Type</Th>
              <Th>Location</Th>
              <Th>Contact</Th>
              <Th>Students</Th>
              <Th>Status</Th>
              <Th>Registered</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-navy/50"
                >
                  No institutions match the current filter.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-t border-navy/5 align-top hover:bg-cream/40"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-navy">
                    {r.institution_name}
                  </div>
                  {r.website && (
                    <a
                      href={r.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-navy/50 hover:text-navy"
                    >
                      {r.website}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-navy/85">{r.institution_type}</td>
                <td className="px-4 py-3 text-navy/85">
                  {r.city}, {r.state}
                </td>
                <td className="px-4 py-3">
                  <div className="text-navy">{r.contact_name}</div>
                  <div className="text-xs text-navy/55">{r.designation}</div>
                  <div className="text-xs text-navy/55">{r.email}</div>
                  <div className="text-xs text-navy/40">{r.phone}</div>
                </td>
                <td className="px-4 py-3 font-medium text-navy">
                  {r.expected_student_count}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={r.status} />
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
                    {savingId === r.id ? (
                      <span className="text-navy/45">Saving…</span>
                    ) : (
                      <>
                        {r.status === "registered" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(r.id, "confirmed")}
                            className="font-medium text-emerald-700 hover:underline"
                          >
                            Confirm
                          </button>
                        )}
                        {r.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(r.id, "cancelled")}
                            className="text-red-600 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                        {r.status === "cancelled" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(r.id, "registered")}
                            className="font-medium text-navy hover:underline"
                          >
                            Reactivate
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-navy/65">
                  {formatDateShort(r.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-navy/10 px-4 py-3 text-xs text-navy/55">
        Showing {filtered.length} of {rows.length} institutions
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left">{children}</th>;
}

function StatusPill({ status }: { status: InstitutionStatus }) {
  const palette: Record<InstitutionStatus, string> = {
    registered: "bg-amber-100 text-amber-800",
    confirmed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${palette[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
