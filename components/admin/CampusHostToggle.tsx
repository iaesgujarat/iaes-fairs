"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface Props {
  fairId: string;
  active: boolean;
  activatedAt: string | null;
  activationNote: string | null;
  /** Total campus-host requests received for this fair. */
  requestCount: number;
  /** Fair must be PUBLISHED to open the programme. */
  fairPublished: boolean;
}

export function CampusHostToggle({
  fairId,
  active,
  activatedAt,
  activationNote,
  requestCount,
  fairPublished,
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fairs/${fairId}/campus-host`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: next,
          note: next ? note.trim() || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not update.");
      setConfirming(false);
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-navy/10 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-navy/55">
            Programme
          </p>
          <p className="font-serif text-lg font-semibold text-navy">
            Campus-Host Requests{" "}
            <span
              className={
                active
                  ? "ml-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                  : "ml-2 inline-flex items-center gap-1.5 rounded-full bg-navy/[0.05] px-2.5 py-0.5 text-xs font-medium text-navy/60"
              }
            >
              <span
                className={
                  active
                    ? "inline-block h-2 w-2 rounded-full bg-emerald-500"
                    : "inline-block h-2 w-2 rounded-full bg-navy/30"
                }
              />
              {active ? "Open" : "Closed"}
            </span>
          </p>
          {active ? (
            <>
              <p className="mt-1 text-sm text-navy/70">
                Indian institutions can request a campus visit from the public
                fair page. Each request emails the admin team.
              </p>
              {activatedAt && (
                <p className="mt-1 text-xs text-navy/55">
                  Opened{" "}
                  {new Date(activatedAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {activationNote ? ` — ${activationNote}` : ""}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-navy/70">
              The &ldquo;Request a Campus Visit&rdquo; card on the fair page is
              greyed out. Open it once visiting universities and an itinerary
              are confirmed.
            </p>
          )}
          <p className="mt-1 text-xs text-navy/55">
            {requestCount} request{requestCount === 1 ? "" : "s"} received so
            far ·{" "}
            <Link
              href="/admin/dashboard?tab=campushost"
              className="font-medium text-navy underline underline-offset-2"
            >
              View requests
            </Link>
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4">
        {active ? (
          <Button
            variant="outline"
            loading={busy}
            onClick={() => toggle(false)}
          >
            Close campus-host requests
          </Button>
        ) : confirming ? (
          <div className="space-y-3 rounded-md border border-navy/15 bg-cream/40 p-4">
            <p className="text-sm font-medium text-navy">
              Open campus-host requests?
            </p>
            <p className="text-xs text-navy/65">
              The public card switches from &ldquo;by invitation&rdquo; to a
              live request form. You can close it again anytime.
            </p>
            <div>
              <label className="text-xs uppercase tracking-wider text-navy/55">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Itinerary confirmed with 12 universities"
                className="mt-1 block w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirming(false);
                  setError(null);
                }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button variant="gold" loading={busy} onClick={() => toggle(true)}>
                Open requests
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="gold"
            onClick={() => setConfirming(true)}
            disabled={!fairPublished}
          >
            Open campus-host requests
          </Button>
        )}
        {!active && !confirming && !fairPublished && (
          <p className="mt-2 text-xs text-navy/55">
            Available once the fair is published.
          </p>
        )}
      </div>
    </div>
  );
}
