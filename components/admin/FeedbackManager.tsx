"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { FairFeedback } from "@/types";

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? "").replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function avg(nums: (number | null)[]): string {
  const vals = nums.filter((n): n is number => n != null);
  if (vals.length === 0) return "—";
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

function Stars({ value }: { value: number | null }) {
  if (value == null) return <span className="text-navy/30">—</span>;
  return (
    <span className="whitespace-nowrap text-gold-500" title={`${value}/5`}>
      {"★".repeat(value)}
      <span className="text-navy/15">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export function FeedbackManager({
  initial,
}: {
  initial: FairFeedback[];
}) {
  const [query, setQuery] = useState("");
  const [fairFilter, setFairFilter] = useState("ALL");

  const fairs = useMemo(
    () =>
      Array.from(
        new Set(initial.map((f) => f.fair_name).filter(Boolean) as string[])
      ).sort(),
    [initial]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initial.filter((f) => {
      if (fairFilter !== "ALL" && f.fair_name !== fairFilter) return false;
      if (!q) return true;
      return [
        f.university_name,
        f.contact_name,
        f.fair_name,
        f.what_went_well,
        f.what_to_improve,
        f.additional_comments,
      ]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [initial, query, fairFilter]);

  function exportCsv() {
    const header = [
      "fair",
      "university",
      "contact",
      "overall",
      "leads",
      "organization",
      "would_return",
      "what_went_well",
      "what_to_improve",
      "additional_comments",
      "submitted",
    ];
    const lines = filtered.map((f) =>
      [
        f.fair_name,
        f.university_name,
        f.contact_name,
        f.overall_rating,
        f.leads_rating,
        f.organization_rating,
        f.recommend_rating,
        f.what_went_well,
        f.what_to_improve,
        f.additional_comments,
        fmtDate(f.created_at),
      ]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "iaes-fair-feedback.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Average-score stats (across the current filter) */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Responses" value={String(filtered.length)} />
        <Stat label="Avg. overall" value={avg(filtered.map((f) => f.overall_rating))} />
        <Stat label="Avg. leads" value={avg(filtered.map((f) => f.leads_rating))} />
        <Stat
          label="Avg. would return"
          value={avg(filtered.map((f) => f.recommend_rating))}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={fairFilter}
          onChange={(e) => setFairFilter(e.target.value)}
          className="rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none"
        >
          <option value="ALL">All fairs</option>
          {fairs.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search university, comments…"
            className="w-64 rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-navy placeholder:text-navy/40 focus:border-navy focus:outline-none"
          />
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
            {filtered.length !== initial.length ? ` (${filtered.length})` : ""}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-navy/10 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
            <tr>
              <Th>University</Th>
              <Th>Overall</Th>
              <Th>Leads</Th>
              <Th>Org.</Th>
              <Th>Return</Th>
              <Th>Comments</Th>
              <Th>Submitted</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-navy/55">
                  {initial.length === 0
                    ? "No feedback yet. Responses from the post-fair survey link appear here once a fair concludes."
                    : "No responses match this filter."}
                </td>
              </tr>
            )}
            {filtered.map((f) => (
              <tr
                key={f.id}
                className="border-t border-navy/5 align-top hover:bg-cream/40"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-navy">
                    {f.university_name || "—"}
                  </div>
                  <div className="text-xs text-navy/55">
                    {[f.contact_name, f.fair_name].filter(Boolean).join(" · ")}
                  </div>
                </td>
                <td className="px-4 py-3"><Stars value={f.overall_rating} /></td>
                <td className="px-4 py-3"><Stars value={f.leads_rating} /></td>
                <td className="px-4 py-3"><Stars value={f.organization_rating} /></td>
                <td className="px-4 py-3"><Stars value={f.recommend_rating} /></td>
                <td className="max-w-sm px-4 py-3 text-xs text-navy/75">
                  {f.what_went_well && (
                    <p>
                      <span className="font-medium text-emerald-700">＋ </span>
                      {f.what_went_well}
                    </p>
                  )}
                  {f.what_to_improve && (
                    <p className="mt-1">
                      <span className="font-medium text-amber-700">△ </span>
                      {f.what_to_improve}
                    </p>
                  )}
                  {f.additional_comments && (
                    <p className="mt-1 text-navy/55">{f.additional_comments}</p>
                  )}
                  {!f.what_went_well &&
                    !f.what_to_improve &&
                    !f.additional_comments && (
                      <span className="text-navy/30">—</span>
                    )}
                </td>
                <td className="px-4 py-3 text-xs text-navy/55">
                  {fmtDate(f.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-navy/10 bg-white p-4 shadow-card">
      <p className="text-2xl font-semibold text-navy">{value}</p>
      <p className="text-xs uppercase tracking-wider text-navy/55">{label}</p>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-left">{children}</th>;
}
