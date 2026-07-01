"use client";

import { useState } from "react";
import { Download, ChevronDown, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface RosterStudent {
  passNumber: string | null;
  fullName: string;
  institution: string | null;
  course: string | null;
  semester: string | null;
  fields: string[];
  countries: string[];
  budget: string | null;
  english: string | null;
  email: string | null;
  phone: string | null;
  checkedIn: boolean;
}

export interface EventRoster {
  stopId: string;
  label: string;
  dateLabel: string;
  students: RosterStudent[];
}

function csvCell(v: string | null | undefined): string {
  const s = String(v ?? "").replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

const HEADER = [
  "pass_number",
  "full_name",
  "institution",
  "course",
  "semester",
  "field_of_interest",
  "preferred_countries",
  "budget_range",
  "english_exam",
  "email",
  "phone",
  "checked_in",
];

export function PortalEventRosters({ rosters }: { rosters: EventRoster[] }) {
  const [openId, setOpenId] = useState<string | null>(rosters[0]?.stopId ?? null);

  if (rosters.length === 0) return null;

  function exportCsv(r: EventRoster) {
    const lines = r.students.map((s) =>
      [
        s.passNumber,
        s.fullName,
        s.institution,
        s.course,
        s.semester,
        s.fields.join("; "),
        s.countries.join("; "),
        s.budget,
        s.english,
        s.email,
        s.phone,
        s.checkedIn ? "yes" : "no",
      ]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob([[HEADER.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.label}-registered-students.csv`
      .replace(/[^a-zA-Z0-9-]+/g, "_")
      .replace(/_+/g, "_");
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-navy/70" />
        <h2 className="font-serif text-xl font-semibold text-navy">
          Registered students by event
        </h2>
      </div>
      <p className="mt-1 text-sm text-navy/60">
        Everyone who registered for the events you&rsquo;re attending and agreed
        to share their details — not only those who visited your booth.
      </p>

      <div className="mt-4 space-y-3">
        {rosters.map((r) => {
          const isOpen = openId === r.stopId;
          return (
            <div
              key={r.stopId}
              className="rounded-lg border border-navy/10 bg-white shadow-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : r.stopId)}
                  className="flex items-center gap-2 text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-navy/60" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-navy/60" />
                  )}
                  <span className="font-medium text-navy">{r.label}</span>
                  <span className="text-xs text-navy/55">
                    {r.dateLabel} · {r.students.length} student
                    {r.students.length === 1 ? "" : "s"}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={r.students.length === 0}
                  onClick={() => exportCsv(r)}
                >
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </div>

              {isOpen && (
                <div className="overflow-x-auto border-t border-navy/5">
                  {r.students.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-navy/55">
                      No shared registrations for this event yet.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
                        <tr>
                          <th className="px-4 py-2 text-left">Student</th>
                          <th className="px-4 py-2 text-left">Course</th>
                          <th className="px-4 py-2 text-left">Interest</th>
                          <th className="px-4 py-2 text-left">Contact</th>
                          <th className="px-4 py-2 text-left">Attended</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.students.map((s, i) => (
                          <tr
                            key={`${s.passNumber}-${i}`}
                            className="border-t border-navy/5 align-top"
                          >
                            <td className="px-4 py-2">
                              <div className="font-medium text-navy">
                                {s.fullName}
                              </div>
                              <div className="text-xs text-navy/55">
                                {[s.institution, s.course, s.semester]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-xs text-navy/70">
                              {[s.fields.join(", "), s.countries.join(", ")]
                                .filter(Boolean)
                                .join(" → ") || "—"}
                            </td>
                            <td className="px-4 py-2 text-xs text-navy/70">
                              {s.email || s.phone ? (
                                <>
                                  {s.email && <div>{s.email}</div>}
                                  {s.phone && <div>{s.phone}</div>}
                                </>
                              ) : (
                                <span className="text-navy/40">
                                  Not shared
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-xs">
                              {s.checkedIn ? (
                                <span className="text-emerald-600">
                                  ✓ Yes
                                </span>
                              ) : (
                                <span className="text-navy/40">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
