"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Download, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateShort } from "@/lib/utils";
import type { FairItineraryStop } from "@/types";

interface PassProfile {
  pass_number: string | null;
  full_name: string;
  email: string;
  phone: string;
  institution_name: string | null;
  current_course: string | null;
  current_semester: string | null;
  field_of_interest: string[] | null;
  preferred_countries: string[] | null;
  budget_range: string | null;
  english_exam: string | null;
  data_sharing_consent: boolean;
}

export interface StudentEventRosterRow {
  itinerary_stop_id: string;
  registered_at: string;
  checked_in_at: string | null;
  source: string | null;
  pass: PassProfile | PassProfile[] | null;
}

interface FlatRow extends PassProfile {
  registered_at: string;
  checked_in_at: string | null;
}

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? "").replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

const CSV_HEADER = [
  "pass_number",
  "full_name",
  "email",
  "phone",
  "institution",
  "course",
  "semester",
  "field_of_interest",
  "preferred_countries",
  "budget_range",
  "english_exam",
  "data_sharing_consent",
  "registered_at",
  "checked_in_at",
];

function stopTitle(s: FairItineraryStop): string {
  if (s.event_type === "CAMPUS_VISIT") return s.institution_name || "Campus visit";
  if (s.event_type === "OPEN_FAIR") return s.venue_name || "Open Fair";
  return s.venue_name || s.institution_name || s.event_type;
}

export function EventRosterManager({
  fairName,
  stops,
  rows,
}: {
  fairName: string;
  stops: FairItineraryStop[];
  rows: StudentEventRosterRow[];
}) {
  const [origin, setOrigin] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const byStop = useMemo(() => {
    const map = new Map<string, FlatRow[]>();
    for (const r of rows) {
      const p = Array.isArray(r.pass) ? r.pass[0] : r.pass;
      if (!p) continue;
      const list = map.get(r.itinerary_stop_id) ?? [];
      list.push({
        ...p,
        registered_at: r.registered_at,
        checked_in_at: r.checked_in_at,
      });
      map.set(r.itinerary_stop_id, list);
    }
    return map;
  }, [rows]);

  // Registrable events only — campus visits + open fair (skip TRAVEL/FREE).
  const eventStops = stops.filter(
    (s) => s.event_type === "CAMPUS_VISIT" || s.event_type === "OPEN_FAIR"
  );

  function copyLink(stopId: string) {
    const link = `${origin}/student/event/${stopId}`;
    void navigator.clipboard?.writeText(link);
    setCopiedId(stopId);
    window.setTimeout(() => setCopiedId((c) => (c === stopId ? null : c)), 1500);
  }

  function exportCsv(stop: FairItineraryStop, list: FlatRow[]) {
    const lines = list.map((r) =>
      [
        r.pass_number,
        r.full_name,
        r.email,
        r.phone,
        r.institution_name,
        r.current_course,
        r.current_semester,
        (r.field_of_interest || []).join("; "),
        (r.preferred_countries || []).join("; "),
        r.budget_range,
        r.english_exam,
        r.data_sharing_consent ? "yes" : "no",
        r.registered_at,
        r.checked_in_at ?? "",
      ]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob([[CSV_HEADER.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fairName}-${stopTitle(stop)}-roster.csv`
      .replace(/[^a-zA-Z0-9-]+/g, "_")
      .replace(/_+/g, "_");
    a.click();
    URL.revokeObjectURL(url);
  }

  if (eventStops.length === 0) {
    return (
      <p className="rounded-lg border border-navy/10 bg-white p-6 text-sm text-navy/55 shadow-card">
        No campus-visit or Open Fair stops in this fair&rsquo;s itinerary yet.
        Add them under <span className="font-medium">Edit itinerary</span> —
        each one then gets its own student registration link here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {eventStops.map((s) => {
        const list = byStop.get(s.id) ?? [];
        const checkedIn = list.filter((r) => r.checked_in_at).length;
        const shared = list.filter((r) => r.data_sharing_consent).length;
        const link = origin ? `${origin}/student/event/${s.id}` : "";
        const isOpen = openId === s.id;
        return (
          <div
            key={s.id}
            className="rounded-lg border border-navy/10 bg-white shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-medium text-navy">
                  {stopTitle(s)}
                  <span className="ml-2 text-xs uppercase tracking-wider text-navy/45">
                    {s.event_type === "OPEN_FAIR" ? "Open Fair" : "Campus"}
                  </span>
                </p>
                <p className="text-xs text-navy/55">
                  {formatDateShort(s.event_date)}
                  {s.city ? ` · ${s.city}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Stat label="Registered" value={list.length} />
                <Stat label="Checked in" value={checkedIn} />
                <Stat label="Shared" value={shared} />
              </div>
            </div>

            {/* Registration link */}
            <div className="flex flex-wrap items-center gap-2 border-t border-navy/5 px-5 py-3">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-md border border-navy/15 bg-cream/40 px-3 py-2 font-mono text-xs text-navy/80"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => copyLink(s.id)}
              >
                {copiedId === s.id ? (
                  <>
                    <Check className="h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy link
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={list.length === 0}
                onClick={() => exportCsv(s, list)}
              >
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenId(isOpen ? null : s.id)}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Roster
              </Button>
            </div>

            {/* Roster table */}
            {isOpen && (
              <div className="overflow-x-auto border-t border-navy/5">
                {list.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-navy/55">
                    No registrations for this event yet.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
                      <tr>
                        <Th>Student</Th>
                        <Th>Institution</Th>
                        <Th>Course</Th>
                        <Th>Shared</Th>
                        <Th>Checked in</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r, i) => (
                        <tr
                          key={`${r.pass_number}-${i}`}
                          className="border-t border-navy/5 align-top"
                        >
                          <td className="px-4 py-2">
                            <div className="font-medium text-navy">
                              {r.full_name}
                            </div>
                            <div className="text-xs text-navy/55">
                              {r.email}
                              {r.phone ? ` · ${r.phone}` : ""}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-navy/80">
                            {r.institution_name || "—"}
                          </td>
                          <td className="px-4 py-2 text-navy/70">
                            {[r.current_course, r.current_semester]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </td>
                          <td className="px-4 py-2">
                            {r.data_sharing_consent ? (
                              <span className="text-emerald-600">✓</span>
                            ) : (
                              <span className="text-navy/30">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-navy/60">
                            {r.checked_in_at
                              ? new Date(r.checked_in_at).toLocaleString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                              : "—"}
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
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-semibold text-navy">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-navy/50">
        {label}
      </p>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-2 text-left">{children}</th>;
}
