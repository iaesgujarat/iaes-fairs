"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { formatDateShort } from "@/lib/utils";
import type { Fair, CampusHostRequest, CampusHostStatus } from "@/types";

interface Row extends CampusHostRequest {
  fair: Pick<Fair, "id" | "name" | "fair_date">;
}

const STATUSES: (CampusHostStatus | "all")[] = [
  "all",
  "new",
  "contacted",
  "scheduled",
  "declined",
  "cancelled",
];

const PILL_BY_STATUS: Record<CampusHostStatus, string> = {
  new: "bg-amber-50 text-amber-800",
  contacted: "bg-blue-50 text-blue-800",
  scheduled: "bg-emerald-50 text-emerald-800",
  declined: "bg-navy/[0.05] text-navy/55",
  cancelled: "bg-red-50 text-red-700",
};

export function CampusHostAdminTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CampusHostStatus | "all">(
    "all"
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updateStatus(id: string, next: CampusHostStatus) {
    if (savingId) return;
    if (next === "declined" || next === "cancelled") {
      const ok = window.confirm(
        next === "declined"
          ? "Decline this campus-visit request? You can reopen it later."
          : "Cancel this scheduled visit? You can reopen the request later."
      );
      if (!ok) return;
    }
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/campus-host/${id}/status`, {
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
        r.official_name.toLowerCase().includes(q) ||
        r.official_email.toLowerCase().includes(q) ||
        r.study_programs.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [rows, query, statusFilter]);

  return (
    <div className="rounded-lg border border-navy/10 bg-white shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-navy/10 p-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
          <Input
            placeholder="Search institution, official, programs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="rounded-md border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/30"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as CampusHostStatus | "all")
          }
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
            <tr>
              <Th>Institution</Th>
              <Th>Official</Th>
              <Th>Visit request</Th>
              <Th>Fair</Th>
              <Th>Status</Th>
              <Th>Received</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-navy/50"
                >
                  {rows.length === 0
                    ? "No campus-visit requests yet. They appear here once the programme is opened on a fair and an institution submits the form."
                    : "No requests match the current filter."}
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
                <td className="px-4 py-3">
                  <div className="text-navy">{r.official_name}</div>
                  <div className="text-xs text-navy/55">
                    <a
                      href={`mailto:${r.official_email}`}
                      className="hover:underline"
                    >
                      {r.official_email}
                    </a>
                  </div>
                  <div className="text-xs text-navy/40">{r.official_phone}</div>
                </td>
                <td className="max-w-xs px-4 py-3 text-xs text-navy/70">
                  <div>
                    <span className="text-navy/50">Programs:</span>{" "}
                    {r.study_programs.join(", ") || "—"}
                  </div>
                  <div className="mt-1">
                    <span className="text-navy/50">Participants:</span>{" "}
                    {r.approx_participants}
                  </div>
                  <div className="mt-1">
                    <span className="text-navy/50">Proposed:</span>{" "}
                    {r.proposed_datetime}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-navy/70">
                  {r.fair?.name || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${PILL_BY_STATUS[r.status]}`}
                  >
                    {r.status}
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
                    {savingId === r.id ? (
                      <span className="text-navy/45">Saving…</span>
                    ) : (
                      <>
                        {r.status === "new" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(r.id, "contacted")}
                            className="font-medium text-blue-700 hover:underline"
                          >
                            Mark contacted
                          </button>
                        )}
                        {(r.status === "new" || r.status === "contacted") && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateStatus(r.id, "scheduled")}
                              className="font-medium text-emerald-700 hover:underline"
                            >
                              Mark scheduled
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(r.id, "declined")}
                              className="text-red-600 hover:underline"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {r.status === "scheduled" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(r.id, "cancelled")}
                            className="text-red-600 hover:underline"
                          >
                            Cancel visit
                          </button>
                        )}
                        {(r.status === "declined" ||
                          r.status === "cancelled") && (
                          <button
                            type="button"
                            onClick={() => updateStatus(r.id, "new")}
                            className="font-medium text-navy hover:underline"
                          >
                            Reopen
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-navy/55">
                  {formatDateShort(r.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-left">{children}</th>;
}
