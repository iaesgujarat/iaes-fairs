"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ITINERARY_EVENT_LABELS } from "@/lib/itinerary";
import type { FairItineraryStop, ItineraryEventType } from "@/types";

interface Props {
  fairId: string;
  initialStops: FairItineraryStop[];
}

type Meta = { saving?: boolean; saved?: boolean; error?: string | null };

const ADD_BUTTONS: { type: ItineraryEventType; label: string }[] = [
  { type: "CAMPUS_VISIT", label: "+ Add Campus Visit" },
  { type: "OPEN_FAIR", label: "+ Add Open Fair" },
  { type: "TRAVEL", label: "+ Add Travel Day" },
  { type: "FREE", label: "+ Add Free Day" },
];

const inputCls =
  "mt-1 block w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/30";
const labelCls = "text-xs uppercase tracking-wider text-navy/55";

/** "10:00:00" | "10:00" -> "10:00" for <input type="time">. */
function toTimeInput(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}

function headerDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Text fields that send null (not "") when cleared.
const NULLABLE = new Set([
  "institution_name",
  "venue_name",
  "address",
  "notes",
  "start_time",
  "end_time",
]);

export function ItineraryBuilder({ fairId, initialStops }: Props) {
  const [stops, setStops] = useState<FairItineraryStop[]>(initialStops);
  const [meta, setMeta] = useState<Record<string, Meta>>({});
  const [adding, setAdding] = useState<ItineraryEventType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [topError, setTopError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  // Last server-persisted snapshot per stop id — drives "did this change?".
  const saved = useRef<Record<string, FairItineraryStop>>(
    Object.fromEntries(initialStops.map((s) => [s.id, s]))
  );

  function patchMeta(id: string, m: Meta) {
    setMeta((prev) => ({ ...prev, [id]: { ...prev[id], ...m } }));
  }

  function flashSaved(id: string) {
    patchMeta(id, { saving: false, saved: true, error: null });
    setTimeout(
      () =>
        setMeta((prev) =>
          prev[id]?.saved ? { ...prev, [id]: { ...prev[id], saved: false } } : prev
        ),
      1600
    );
  }

  function setLocal(id: string, patch: Partial<FairItineraryStop>) {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }

  async function sendPatch(
    id: string,
    patch: Record<string, unknown>
  ): Promise<FairItineraryStop> {
    const res = await fetch(`/api/admin/fairs/${fairId}/itinerary/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Save failed.");
    return data.stop as FairItineraryStop;
  }

  // Commit one field on blur/change. Skips the request when unchanged.
  async function commit(
    id: string,
    key: keyof FairItineraryStop,
    rawValue: string
  ) {
    const prevSnap = saved.current[id];
    let value: string | null = rawValue;
    if (NULLABLE.has(key as string)) value = rawValue.trim() || null;
    else if (key === "city") value = rawValue.trim();
    else if (key === "event_date" && !rawValue) {
      // event_date is NOT NULL — restore the last good value instead.
      setLocal(id, { event_date: prevSnap?.event_date });
      return;
    }

    if (prevSnap && (prevSnap[key] ?? null) === (value ?? null)) return;

    patchMeta(id, { saving: true, error: null });
    try {
      const updated = await sendPatch(id, { [key]: value });
      saved.current[id] = updated;
      setLocal(id, updated);
      flashSaved(id);
    } catch (e) {
      patchMeta(id, {
        saving: false,
        error: e instanceof Error ? e.message : "Save failed.",
      });
    }
  }

  async function toggle(
    id: string,
    key: "is_confirmed" | "is_public" | "is_main_fair"
  ) {
    const stop = stops.find((s) => s.id === id);
    if (!stop) return;
    const nextVal = !stop[key];

    // Optimistic. Main-fair is exclusive: clear it on every other stop.
    const before = stops;
    setStops((prev) =>
      prev.map((s) => {
        if (s.id === id) return { ...s, [key]: nextVal };
        if (key === "is_main_fair" && nextVal) {
          return { ...s, is_main_fair: false };
        }
        return s;
      })
    );
    patchMeta(id, { saving: true, error: null });
    try {
      const updated = await sendPatch(id, { [key]: nextVal });
      saved.current[id] = updated;
      if (key === "is_main_fair" && nextVal) {
        // Server cleared the others — mirror that in our snapshots.
        for (const s of before) {
          if (s.id !== id && saved.current[s.id]) {
            saved.current[s.id] = {
              ...saved.current[s.id],
              is_main_fair: false,
            };
          }
        }
      }
      setLocal(id, updated);
      flashSaved(id);
    } catch (e) {
      setStops(before);
      patchMeta(id, {
        saving: false,
        error: e instanceof Error ? e.message : "Save failed.",
      });
    }
  }

  async function addStop(type: ItineraryEventType) {
    setAdding(type);
    setTopError(null);
    try {
      const res = await fetch(`/api/admin/fairs/${fairId}/itinerary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not add stop.");
      const stop = data.stop as FairItineraryStop;
      saved.current[stop.id] = stop;
      setStops((prev) => [...prev, stop]);
    } catch (e) {
      setTopError(e instanceof Error ? e.message : "Could not add stop.");
    } finally {
      setAdding(null);
    }
  }

  async function remove(id: string) {
    setConfirmDelete(null);
    patchMeta(id, { saving: true, error: null });
    try {
      const res = await fetch(
        `/api/admin/fairs/${fairId}/itinerary/${id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed.");
      delete saved.current[id];
      setStops((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      patchMeta(id, {
        saving: false,
        error: e instanceof Error ? e.message : "Delete failed.",
      });
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= stops.length) return;
    const before = stops;
    const next = [...stops];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((s, i) => ({
      ...s,
      day_number: i + 1,
      sort_order: i + 1,
    }));
    setStops(renumbered);
    setReordering(true);
    setTopError(null);
    try {
      const res = await fetch(
        `/api/admin/fairs/${fairId}/itinerary/reorder`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: renumbered.map((s) => s.id) }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reorder failed.");
      for (const s of renumbered) {
        if (saved.current[s.id]) {
          saved.current[s.id] = {
            ...saved.current[s.id],
            day_number: s.day_number,
            sort_order: s.sort_order,
          };
        }
      }
    } catch (e) {
      setStops(before);
      setTopError(e instanceof Error ? e.message : "Reorder failed.");
    } finally {
      setReordering(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {ADD_BUTTONS.map((b) => (
          <Button
            key={b.type}
            variant="secondary"
            size="sm"
            loading={adding === b.type}
            disabled={adding !== null}
            onClick={() => addStop(b.type)}
          >
            {b.label}
          </Button>
        ))}
      </div>

      {topError && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {topError}
        </p>
      )}

      {stops.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-navy/15 bg-cream/40 px-4 py-6 text-center text-sm text-navy/55">
          No stops yet. Add the first campus visit or open fair above.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {stops.map((stop, index) => {
            const m = meta[stop.id] || {};
            const isCampus = stop.event_type === "CAMPUS_VISIT";
            const isOpen = stop.event_type === "OPEN_FAIR";
            const showVenueFields = isCampus || isOpen;
            return (
              <div
                key={stop.id}
                className="rounded-lg border border-navy/10 bg-white p-5 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={index === 0 || reordering}
                        onClick={() => move(index, -1)}
                        className="text-navy/40 hover:text-navy disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={index === stops.length - 1 || reordering}
                        onClick={() => move(index, 1)}
                        className="text-navy/40 hover:text-navy disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                    <div>
                      <p className="font-serif text-base font-semibold text-navy">
                        Day {stop.day_number} — {headerDate(stop.event_date)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs uppercase tracking-wider text-navy/55">
                          {ITINERARY_EVENT_LABELS[stop.event_type]}
                        </span>
                        {stop.is_main_fair && (
                          <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-navy">
                            ★ MAIN FAIR
                          </span>
                        )}
                        {!stop.is_confirmed && (
                          <span className="rounded-full border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
                            TBC
                          </span>
                        )}
                        {!stop.is_public && (
                          <span className="rounded-full border border-navy/15 bg-navy/5 px-2 py-0.5 text-[10px] font-semibold text-navy/60">
                            HIDDEN
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    {m.saving && <span className="text-navy/45">Saving…</span>}
                    {m.saved && (
                      <span className="text-emerald-600">✓ Saved</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Type</label>
                    <select
                      className={inputCls}
                      value={stop.event_type}
                      onChange={(e) =>
                        commit(stop.id, "event_type", e.target.value)
                      }
                    >
                      <option value="CAMPUS_VISIT">Campus Visit</option>
                      <option value="OPEN_FAIR">Open Fair</option>
                      <option value="TRAVEL">Travel Day</option>
                      <option value="FREE">Free Day</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Date</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={stop.event_date?.slice(0, 10) ?? ""}
                      onChange={(e) =>
                        setLocal(stop.id, { event_date: e.target.value })
                      }
                      onBlur={(e) =>
                        commit(stop.id, "event_date", e.target.value)
                      }
                    />
                  </div>

                  {isCampus && (
                    <div>
                      <label className={labelCls}>Institution Name *</label>
                      <input
                        type="text"
                        className={inputCls}
                        value={stop.institution_name ?? ""}
                        onChange={(e) =>
                          setLocal(stop.id, {
                            institution_name: e.target.value,
                          })
                        }
                        onBlur={(e) =>
                          commit(
                            stop.id,
                            "institution_name",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  )}

                  {showVenueFields && (
                    <div>
                      <label className={labelCls}>
                        Venue / Hall {isOpen ? "*" : ""}
                      </label>
                      <input
                        type="text"
                        className={inputCls}
                        value={stop.venue_name ?? ""}
                        onChange={(e) =>
                          setLocal(stop.id, { venue_name: e.target.value })
                        }
                        onBlur={(e) =>
                          commit(stop.id, "venue_name", e.target.value)
                        }
                      />
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>City *</label>
                    <input
                      type="text"
                      className={inputCls}
                      value={stop.city ?? ""}
                      onChange={(e) =>
                        setLocal(stop.id, { city: e.target.value })
                      }
                      onBlur={(e) => commit(stop.id, "city", e.target.value)}
                    />
                  </div>

                  {showVenueFields && (
                    <div>
                      <label className={labelCls}>Full Address</label>
                      <input
                        type="text"
                        className={inputCls}
                        value={stop.address ?? ""}
                        onChange={(e) =>
                          setLocal(stop.id, { address: e.target.value })
                        }
                        onBlur={(e) =>
                          commit(stop.id, "address", e.target.value)
                        }
                      />
                    </div>
                  )}

                  {showVenueFields && (
                    <>
                      <div>
                        <label className={labelCls}>Start Time</label>
                        <input
                          type="time"
                          className={inputCls}
                          value={toTimeInput(stop.start_time)}
                          onChange={(e) =>
                            commit(stop.id, "start_time", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>End Time</label>
                        <input
                          type="time"
                          className={inputCls}
                          value={toTimeInput(stop.end_time)}
                          onChange={(e) =>
                            commit(stop.id, "end_time", e.target.value)
                          }
                        />
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-2">
                    <label className={labelCls}>Notes</label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="Lunch provided by IAES after the session."
                      value={stop.notes ?? ""}
                      onChange={(e) =>
                        setLocal(stop.id, { notes: e.target.value })
                      }
                      onBlur={(e) =>
                        commit(stop.id, "notes", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-navy/5 pt-4">
                  <ToggleChip
                    on={stop.is_confirmed}
                    onLabel="✅ Confirmed"
                    offLabel="⏳ Mark Confirmed"
                    onClick={() => toggle(stop.id, "is_confirmed")}
                    disabled={m.saving}
                  />
                  <ToggleChip
                    on={stop.is_main_fair}
                    onLabel="★ Main Fair ✓"
                    offLabel="⭐ Mark as Main Fair"
                    onClick={() => toggle(stop.id, "is_main_fair")}
                    disabled={m.saving}
                  />
                  <ToggleChip
                    on={stop.is_public}
                    onLabel="👁 Public"
                    offLabel="🚫 Hidden"
                    onClick={() => toggle(stop.id, "is_public")}
                    disabled={m.saving}
                  />
                  <div className="ml-auto">
                    {confirmDelete === stop.id ? (
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span className="text-navy/70">Delete this stop?</span>
                        <button
                          type="button"
                          onClick={() => remove(stop.id)}
                          className="rounded-md bg-red-600 px-2.5 py-1 font-medium text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-md border border-navy/15 px-2.5 py-1 text-navy hover:bg-cream"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(stop.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        🗑 Delete Stop
                      </button>
                    )}
                  </div>
                </div>

                {m.error && (
                  <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {m.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToggleChip({
  on,
  onLabel,
  offLabel,
  onClick,
  disabled,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        on
          ? "rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 disabled:opacity-60"
          : "rounded-full border border-navy/15 bg-white px-3 py-1 text-xs font-medium text-navy/70 hover:bg-cream disabled:opacity-60"
      }
    >
      {on ? onLabel : offLabel}
    </button>
  );
}
