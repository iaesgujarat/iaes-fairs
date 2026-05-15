"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { formatDateShort } from "@/lib/utils";

interface PassRow {
  id: string;
  pass_uuid: string;
  pass_number: string;
  full_name: string;
  email: string;
  phone: string;
  institution_name: string;
  current_course: string | null;
  current_semester: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  data_sharing_consent: boolean;
  whatsapp_consent: boolean;
  email_consent: boolean;
  created_at: string;
}

interface ScanRow {
  pass_uuid: string;
  university_registration_id: string;
  interested: boolean;
  scanned_at: string;
}

interface UniversityRow {
  id: string;
  university_name: string;
}

export function FairDayTab({
  passes,
  scans,
  universities,
}: {
  passes: PassRow[];
  scans: ScanRow[];
  universities: UniversityRow[];
}) {
  const [passQuery, setPassQuery] = useState("");

  const scansByPass = useMemo(() => {
    const map = new Map<string, ScanRow[]>();
    for (const s of scans) {
      const arr = map.get(s.pass_uuid) ?? [];
      arr.push(s);
      map.set(s.pass_uuid, arr);
    }
    return map;
  }, [scans]);

  const universityNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of universities) map.set(u.id, u.university_name);
    return map;
  }, [universities]);

  const scansByUniversity = useMemo(() => {
    const map = new Map<
      string,
      { count: number; interested: number; lastScan: string }
    >();
    for (const s of scans) {
      const prev = map.get(s.university_registration_id) ?? {
        count: 0,
        interested: 0,
        lastScan: s.scanned_at,
      };
      prev.count += 1;
      if (s.interested) prev.interested += 1;
      if (s.scanned_at > prev.lastScan) prev.lastScan = s.scanned_at;
      map.set(s.university_registration_id, prev);
    }
    return map;
  }, [scans]);

  const totalCheckedIn = passes.filter((p) => p.checked_in).length;
  const totalScans = scans.length;
  const universitiesScanning = scansByUniversity.size;

  const filteredPasses = useMemo(() => {
    const q = passQuery.toLowerCase().trim();
    if (!q) return passes;
    return passes.filter(
      (p) =>
        p.pass_number.toLowerCase().includes(q) ||
        p.full_name.toLowerCase().includes(q) ||
        p.institution_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }, [passes, passQuery]);

  const universityRows = useMemo(() => {
    return Array.from(scansByUniversity.entries())
      .map(([id, stats]) => ({
        id,
        name: universityNameById.get(id) ?? "Unknown university",
        ...stats,
      }))
      .sort((a, b) => b.count - a.count);
  }, [scansByUniversity, universityNameById]);

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Passes Issued" value={passes.length.toString()} />
        <Stat
          label="Checked In"
          value={totalCheckedIn.toString()}
          accent="green"
        />
        <Stat label="Total Scans" value={totalScans.toString()} accent="navy" />
        <Stat
          label="Universities Scanning"
          value={universitiesScanning.toString()}
          accent="navy"
        />
      </div>

      <div className="mb-8 flex items-center justify-end">
        <a
          href="/api/admin/scans?format=csv"
          className="inline-flex items-center gap-2 rounded-md border border-navy/15 bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-cream"
        >
          Download Scans CSV
        </a>
      </div>

      <div className="mb-10 rounded-lg border border-navy/10 bg-white shadow-card">
        <div className="border-b border-navy/10 p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
            <Input
              placeholder="Search pass number, name, institution..."
              value={passQuery}
              onChange={(e) => setPassQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
              <tr>
                <Th>Pass No.</Th>
                <Th>Name</Th>
                <Th>Institution</Th>
                <Th>Course</Th>
                <Th>Checked In</Th>
                <Th>Scans</Th>
              </tr>
            </thead>
            <tbody>
              {filteredPasses.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-navy/55"
                  >
                    No passes yet.
                  </td>
                </tr>
              )}
              {filteredPasses.map((p) => {
                const passScans = scansByPass.get(p.pass_uuid) ?? [];
                return (
                  <tr
                    key={p.id}
                    className="border-t border-navy/5 align-top hover:bg-cream/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-navy">
                      {p.pass_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-navy">{p.full_name}</div>
                      <div className="text-xs text-navy/55">{p.email}</div>
                    </td>
                    <td className="px-4 py-3 text-navy/85">
                      {p.institution_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-navy/70">
                      {[p.current_course, p.current_semester]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.checked_in ? (
                        <span className="text-emerald-700">
                          ✓{" "}
                          {p.checked_in_at
                            ? new Date(p.checked_in_at).toLocaleTimeString(
                                "en-IN",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : ""}
                        </span>
                      ) : (
                        <span className="text-navy/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-navy">
                      {passScans.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-navy/10 px-4 py-3 text-xs text-navy/55">
          Showing {filteredPasses.length} of {passes.length} passes
        </div>
      </div>

      <div className="rounded-lg border border-navy/10 bg-white shadow-card">
        <div className="border-b border-navy/10 px-5 py-3">
          <p className="text-xs uppercase tracking-wider text-navy/55">
            Scans per University
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
              <tr>
                <Th>University</Th>
                <Th>Students Scanned</Th>
                <Th>Interested</Th>
                <Th>Last Scan</Th>
              </tr>
            </thead>
            <tbody>
              {universityRows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-navy/55"
                  >
                    No scans recorded yet.
                  </td>
                </tr>
              )}
              {universityRows.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-navy/5 align-top hover:bg-cream/40"
                >
                  <td className="px-4 py-3 text-navy">{u.name}</td>
                  <td className="px-4 py-3 font-medium text-navy">{u.count}</td>
                  <td className="px-4 py-3 text-navy/80">{u.interested}</td>
                  <td className="px-4 py-3 text-xs text-navy/65">
                    {formatDateShort(u.lastScan)} ·{" "}
                    {new Date(u.lastScan).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "green" | "navy";
}) {
  const bar: Record<typeof accent, string> = {
    default: "bg-navy/30",
    green: "bg-emerald-500",
    navy: "bg-gold",
  };
  return (
    <div className="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
      <div className={`h-1 ${bar[accent]}`} />
      <div className="p-5">
        <p className="text-xs uppercase tracking-wider text-navy/55">{label}</p>
        <p className="mt-2 font-serif text-2xl font-semibold text-navy">
          {value}
        </p>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left">{children}</th>;
}
