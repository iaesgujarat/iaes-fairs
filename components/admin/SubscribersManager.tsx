"use client";

import { useMemo, useState } from "react";
import { Download, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AnnouncementLead } from "@/types";

type RoleFilter = "ALL" | "university" | "student";

function csvCell(v: string | null | undefined): string {
  const s = (v ?? "").replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SubscribersManager({
  initialLeads,
}: {
  initialLeads: AnnouncementLead[];
}) {
  const [leads, setLeads] = useState<AnnouncementLead[]>(initialLeads);
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (role !== "ALL" && l.role !== role) return false;
      if (!q) return true;
      return [
        l.full_name,
        l.email,
        l.university_name,
        l.country,
        l.city,
        l.study_level,
        l.field_of_interest,
        ...(l.preferred_countries ?? []),
      ]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [leads, role, query]);

  const universities = leads.filter((l) => l.role === "university");
  const students = leads.filter((l) => l.role === "student");
  const active = leads.filter((l) => l.is_active);
  const waOptIns = leads.filter(
    (l) => l.is_active && l.whatsapp_consent && l.phone_e164
  );

  async function deactivate(lead: AnnouncementLead) {
    if (
      !confirm(
        `Stop sending announcements to ${lead.full_name} (${lead.email})? You can re-activate them later.`
      )
    ) {
      return;
    }
    setBusyId(lead.id);
    try {
      const res = await fetch(`/api/admin/subscribers/${lead.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Could not deactivate.");
      setLeads((ls) =>
        ls.map((l) =>
          l.id === lead.id
            ? { ...l, is_active: false, unsubscribed_at: new Date().toISOString() }
            : l
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not deactivate.");
    } finally {
      setBusyId(null);
    }
  }

  async function reactivate(lead: AnnouncementLead) {
    setBusyId(lead.id);
    try {
      const res = await fetch(`/api/admin/subscribers/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      if (!res.ok) throw new Error("Could not re-activate.");
      setLeads((ls) =>
        ls.map((l) =>
          l.id === lead.id ? { ...l, is_active: true, unsubscribed_at: null } : l
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not re-activate.");
    } finally {
      setBusyId(null);
    }
  }

  function exportCsv() {
    const header = [
      "role",
      "name",
      "email",
      "whatsapp",
      "whatsapp_consent",
      "email_consent",
      "university",
      "country",
      "job_title",
      "preferred_months",
      "city",
      "study_level",
      "preferred_countries",
      "field_of_interest",
      "intake_year",
      "status",
      "signed_up",
    ];
    const lines = filtered.map((l) =>
      [
        l.role,
        l.full_name,
        l.email,
        l.phone_e164,
        l.whatsapp_consent ? "yes" : "no",
        l.email_consent ? "yes" : "no",
        l.university_name,
        l.country,
        l.job_title,
        (l.preferred_months ?? []).join("; "),
        l.city,
        l.study_level,
        (l.preferred_countries ?? []).join("; "),
        l.field_of_interest,
        l.intake_year,
        l.is_active ? "active" : "unsubscribed",
        fmtDate(l.created_at),
      ]
        .map((c) => csvCell(c as string | null))
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      role === "ALL" ? "iaes-subscribers.csv" : `iaes-subscribers-${role}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total signups" value={leads.length} />
        <Stat label="Universities" value={universities.length} />
        <Stat label="Students" value={students.length} />
        <Stat
          label="WhatsApp opt-ins"
          value={waOptIns.length}
          hint={`${active.length} active overall`}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-navy/55">Show:</span>
          {(
            [
              ["ALL", "All"],
              ["university", "Universities"],
              ["student", "Students"],
            ] as [RoleFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRole(value)}
              className={
                role === value
                  ? "rounded-full bg-navy px-3 py-1 text-white"
                  : "rounded-full border border-navy/15 px-3 py-1 text-navy/70 hover:bg-cream"
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, city, country…"
            className="w-64 rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-navy placeholder:text-navy/40 focus:border-navy focus:outline-none"
          />
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
            {filtered.length !== leads.length ? ` (${filtered.length})` : ""}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-navy/10 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
            <tr>
              <Th>Who</Th>
              <Th>Contact</Th>
              <Th>Details</Th>
              <Th>Notify via</Th>
              <Th>Status</Th>
              <Th>Signed up</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-navy/55">
                  {leads.length === 0
                    ? "No one has subscribed yet. Signups from the website's “Keep me posted” form appear here."
                    : "No subscribers match this filter."}
                </td>
              </tr>
            )}
            {filtered.map((l) => (
              <tr
                key={l.id}
                className="border-t border-navy/5 align-top hover:bg-cream/40"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-navy">{l.full_name}</div>
                  <div className="text-xs text-navy/55">
                    {l.role === "university"
                      ? "🎓 University"
                      : "🧑‍🎓 Student"}
                  </div>
                </td>
                <td className="px-4 py-3 text-navy/85">
                  <div>{l.email}</div>
                  {l.phone_e164 && (
                    <div className="text-xs text-navy/55">{l.phone_e164}</div>
                  )}
                </td>
                <td className="max-w-xs px-4 py-3 text-xs text-navy/70">
                  {l.role === "university" ? (
                    <>
                      {l.university_name && (
                        <div className="font-medium text-navy/85">
                          {l.university_name}
                        </div>
                      )}
                      <div>
                        {[l.country, l.job_title].filter(Boolean).join(" · ") ||
                          "—"}
                      </div>
                      {l.preferred_months?.length ? (
                        <div className="mt-1 text-navy/55">
                          Prefers: {l.preferred_months.map((m) => m.slice(0, 3)).join(", ")}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div>
                        {[l.city, l.study_level, l.intake_year]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                      {l.preferred_countries?.length ? (
                        <div className="mt-1 text-navy/55">
                          Wants: {l.preferred_countries.join(", ")}
                        </div>
                      ) : null}
                      {l.field_of_interest && (
                        <div className="text-navy/55">{l.field_of_interest}</div>
                      )}
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {l.email_consent && <Pill>Email</Pill>}
                    {l.whatsapp_consent && l.phone_e164 && <Pill>WhatsApp</Pill>}
                    {!l.email_consent && !(l.whatsapp_consent && l.phone_e164) && (
                      <span className="text-navy/45">None</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">
                  {l.is_active ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-navy/[0.05] px-2.5 py-0.5 font-medium text-navy/55">
                      Unsubscribed
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-navy/55">
                  {fmtDate(l.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  {l.is_active ? (
                    <button
                      onClick={() => deactivate(l)}
                      disabled={busyId === l.id}
                      aria-label="Stop announcements to this subscriber"
                      title="Stop announcements"
                      className="text-navy/55 hover:text-red-700 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => reactivate(l)}
                      disabled={busyId === l.id}
                      aria-label="Re-activate this subscriber"
                      title="Re-activate"
                      className="text-navy/55 hover:text-emerald-700 disabled:opacity-40"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-navy/50">
        These are self-serve signups from the website&rsquo;s subscribe form.
        To send them a fair announcement, open the fair and use
        &ldquo;Announce to subscribers&rdquo;. Removing someone here only stops
        future announcements — it never deletes their details.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-navy/10 bg-white p-4 shadow-card">
      <p className="text-2xl font-semibold text-navy">{value}</p>
      <p className="text-xs uppercase tracking-wider text-navy/55">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-navy/45">{hint}</p>}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-navy/15 bg-cream/60 px-2 py-0.5 text-navy/70">
      {children}
    </span>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-left">{children}</th>;
}
