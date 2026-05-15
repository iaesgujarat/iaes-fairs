"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Props {
  fairId: string;
  active: boolean;
  activatedAt: string | null;
  activationNote: string | null;
  /** Count of regs currently in status='registered' (will be notified on activate). */
  registeredCount: number;
}

export function GatewayToggle({
  fairId,
  active,
  activatedAt,
  activationNote,
  registeredCount,
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    notifiedCount: number;
    failedCount: number;
  } | null>(null);

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fairs/${fairId}/activate-gateway`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Activation failed.");
      setResult({
        notifiedCount: data.notifiedCount ?? 0,
        failedCount: data.failedCount ?? 0,
      });
      setConfirming(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Activation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-navy/10 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-navy/55">
            Step 2.5
          </p>
          <p className="font-serif text-lg font-semibold text-navy">
            Payment Gateway{" "}
            <span
              className={
                active
                  ? "ml-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                  : "ml-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800"
              }
            >
              <span
                className={
                  active
                    ? "inline-block h-2 w-2 rounded-full bg-emerald-500"
                    : "inline-block h-2 w-2 rounded-full bg-amber-400"
                }
              />
              {active ? "Active" : "Inactive"}
            </span>
          </p>
          {active ? (
            <>
              <p className="mt-1 text-sm text-navy/70">
                Razorpay payments are live. New registrations go directly to
                the payment flow.
              </p>
              {activatedAt && (
                <p className="mt-1 text-xs text-navy/55">
                  Activated{" "}
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
              Universities can register but cannot pay yet. Registrations
              receive a Proforma Invoice and wait for activation.
            </p>
          )}
        </div>
      </div>

      {!active && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            <strong>{registeredCount}</strong> registered university
            {registeredCount === 1 ? "" : "ies"} will receive the &ldquo;payment
            now open&rdquo; email on activation. New registrations will go
            directly to payment.
          </p>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          Gateway activated. Notified {result.notifiedCount} recipient
          {result.notifiedCount === 1 ? "" : "s"}.
          {result.failedCount > 0 && ` ${result.failedCount} email(s) failed.`}
        </div>
      )}

      {!active && (
        <div className="mt-4">
          {confirming ? (
            <div className="space-y-3 rounded-md border border-navy/15 bg-cream/40 p-4">
              <p className="text-sm font-medium text-navy">
                Activate payment gateway?
              </p>
              <p className="text-xs text-navy/65">
                This is one-way during the registration window. New regs go to
                payment immediately; existing registrations get the &ldquo;payment
                open&rdquo; email.
              </p>
              <div>
                <label className="text-xs uppercase tracking-wider text-navy/55">
                  Activation note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Razorpay account verified — 25 May 2026"
                  className="mt-1 block w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}
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
                <Button variant="gold" loading={busy} onClick={activate}>
                  ▶ Activate Payment Gateway
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="gold" onClick={() => setConfirming(true)}>
              ▶ Activate Payment Gateway
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
