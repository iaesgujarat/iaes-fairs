"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ITINERARY_EVENT_LABELS, itineraryTimeRange } from "@/lib/itinerary";
import type { FairItineraryStop } from "@/types";

export function EventOptinEditor({
  registrationId,
  stops,
  initialSelectedIds,
}: {
  registrationId: string;
  stops: FairItineraryStop[];
  initialSelectedIds: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedIds)
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (stops.length === 0) {
    return (
      <p className="text-sm text-navy/55">
        No public itinerary stops yet — opt-ins will appear here once the
        fair itinerary is built.
      </p>
    );
  }

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/registrations/${registrationId}/event-optins`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stopIds: Array.from(selected) }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed.");
      setMsg(`Saved — ${data.count} event(s) selected.`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {stops.map((s, i) => {
          const when = new Date(s.event_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          });
          const time = itineraryTimeRange(s);
          const place = s.institution_name || s.venue_name || s.city;
          return (
            <label
              key={s.id}
              className="flex cursor-pointer items-start gap-2.5 rounded-md border border-navy/10 bg-white p-3 text-sm"
            >
              <input
                type="checkbox"
                className="mt-0.5 accent-navy"
                checked={selected.has(s.id)}
                onChange={(e) => toggle(s.id, e.target.checked)}
              />
              <span>
                <span className="font-medium text-navy">
                  Day {i + 1} · {when} — {place}
                </span>
                {!s.is_confirmed && (
                  <span className="ml-2 rounded-full border border-yellow-300 bg-yellow-100 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-700">
                    TBC
                  </span>
                )}
                <span className="block text-xs text-navy/55">
                  {ITINERARY_EVENT_LABELS[s.event_type]}
                  {s.city ? ` · ${s.city}` : ""}
                  {time ? ` · ${time}` : ""}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="gold" loading={busy} onClick={save}>
          Save attendance
        </Button>
        {msg && <span className="text-xs text-emerald-700">{msg}</span>}
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  );
}
