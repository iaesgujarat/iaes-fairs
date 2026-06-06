"use client";

import { useState } from "react";

/**
 * Admin trigger: email every participating university its "booth scanner
 * is ready" guide (pre-bound scan link + portal link + steps). Click it
 * ~1 week before the fair.
 */
export function SendScannerGuideButton({
  fairId,
  fairName,
}: {
  fairId: string;
  fairName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    if (
      !window.confirm(
        `Email the booth-scanner guide to every university registered for ${fairName}?`
      )
    )
      return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/fairs/${fairId}/send-scanner-guide`,
        { method: "POST" }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Send failed.");
      setMsg(
        `Sent to ${body.sent} universit${body.sent === 1 ? "y" : "ies"}` +
          (body.failed ? ` · ${body.failed} failed` : "") +
          "."
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-navy/10 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy">
            Booth scanner guide
          </p>
          <p className="mt-0.5 text-xs text-navy/60">
            Email each university its pre-bound scan link + leads portal +
            how-to. Send ~1 week before the fair.
          </p>
        </div>
        <button
          type="button"
          onClick={send}
          disabled={busy}
          className="shrink-0 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send to all universities"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-emerald-700">{msg}</p>}
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  );
}
