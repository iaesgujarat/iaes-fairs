"use client";

import { useMemo, useState } from "react";
import { Download, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface PortalScan {
  pass_uuid: string;
  pass_number: string;
  full_name: string;
  institution_name: string;
  current_course: string | null;
  current_semester: string | null;
  english_exam: string | null;
  field_of_interest: string[];
  budget_range: string | null;
  preferred_countries: string[];
  phone: string | null;
  email: string | null;
  rep_notes: string | null;
  interested: boolean;
  scanned_at: string;
}

export function PortalStudents({
  students,
  downloadHref,
}: {
  students: PortalScan[];
  downloadHref: string;
}) {
  const [filter, setFilter] = useState<"all" | "interested">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return students.filter((s) => {
      if (filter === "interested" && !s.interested) return false;
      if (!q) return true;
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.institution_name.toLowerCase().includes(q) ||
        s.pass_number.toLowerCase().includes(q) ||
        (s.field_of_interest || []).some((f) =>
          f.toLowerCase().includes(q)
        )
      );
    });
  }, [students, filter, query]);

  return (
    <div className="mt-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All ({students.length})
          </FilterPill>
          <FilterPill
            active={filter === "interested"}
            onClick={() => setFilter("interested")}
          >
            Interested only
          </FilterPill>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
            <Input
              placeholder="Search name, institution, field..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <a
            href={downloadHref}
            className="inline-flex items-center gap-2 rounded-md border border-navy/15 bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-cream"
          >
            <Download className="h-4 w-4" /> CSV
          </a>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-navy/10 bg-white p-10 text-center text-sm text-navy/55 shadow-card">
          No students match this filter.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((s) => (
            <li
              key={s.pass_uuid}
              className="rounded-lg border border-navy/10 bg-white p-5 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-lg font-semibold text-navy">
                    {s.full_name}
                  </p>
                  <p className="text-sm text-navy/70">
                    {s.institution_name}
                    {(s.current_course || s.current_semester) && (
                      <>
                        {" "}
                        ·{" "}
                        {[s.current_course, s.current_semester]
                          .filter(Boolean)
                          .join(" · ")}
                      </>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-navy/50">
                    Pass {s.pass_number} · Scanned{" "}
                    {new Date(s.scanned_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {s.interested && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    <Star className="h-3 w-3" /> Interested
                  </span>
                )}
              </div>

              <div className="mt-3 grid gap-1 text-sm text-navy">
                {s.email && (
                  <p>
                    <span className="text-navy/55">✉ </span>
                    {s.email}
                  </p>
                )}
                {s.phone && (
                  <p>
                    <span className="text-navy/55">📱 </span>
                    {s.phone}
                  </p>
                )}
                {!s.email && !s.phone && (
                  <p className="text-xs italic text-navy/50">
                    Student opted out of sharing direct contact info.
                  </p>
                )}
              </div>

              {s.field_of_interest.length > 0 && (
                <div className="mt-3">
                  <ul className="flex flex-wrap gap-1.5 text-xs">
                    {s.field_of_interest.map((f) => (
                      <li
                        key={f}
                        className="rounded-full bg-gold/10 px-2.5 py-0.5 text-navy"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                {s.budget_range && <Detail label="Budget" value={s.budget_range} />}
                {s.preferred_countries.length > 0 && (
                  <Detail
                    label="Countries"
                    value={s.preferred_countries.join(", ")}
                  />
                )}
                {s.english_exam && (
                  <Detail label="English" value={s.english_exam} />
                )}
              </dl>

              {s.rep_notes && (
                <p className="mt-3 rounded-md bg-cream/60 px-3 py-2 text-xs italic text-navy/80">
                  &ldquo;{s.rep_notes}&rdquo;
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-navy px-3 py-1 text-xs text-white"
          : "rounded-full border border-navy/15 px-3 py-1 text-xs text-navy/70 hover:bg-cream"
      }
    >
      {children}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-navy/55">
        {label}
      </dt>
      <dd className="mt-0.5 text-navy">{value}</dd>
    </div>
  );
}
