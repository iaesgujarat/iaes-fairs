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
  const [busy, setBusy] = useState<"email" | "whatsapp" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(
    kind: "email" | "whatsapp",
    path: string,
    confirmMsg: string,
    ok: (body: { sent?: number; attempted?: number; failed?: number }) => string
  ) {
    if (!window.confirm(confirmMsg)) return;
    setBusy(kind);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/fairs/${fairId}/${path}`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Send failed.");
      setMsg(ok(body));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border border-navy/10 bg-white p-4 shadow-card">
      <p className="text-sm font-semibold text-navy">Booth scanner outreach</p>
      <p className="mt-0.5 text-xs text-navy/60">
        Each university gets its own pre-bound scan link + leads portal.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            run(
              "email",
              "send-scanner-guide",
              `Email the booth-scanner guide to every university registered for ${fairName}?`,
              (b) =>
                `Email sent to ${b.sent} universit${b.sent === 1 ? "y" : "ies"}` +
                (b.failed ? ` · ${b.failed} failed` : "") +
                "."
            )
          }
          disabled={busy !== null}
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-60"
        >
          {busy === "email" ? "Sending…" : "Send guide email (~1 week before)"}
        </button>
        <button
          type="button"
          onClick={() =>
            run(
              "whatsapp",
              "send-scanner-whatsapp",
              `Send the fair-morning WhatsApp scanner nudge to every university registered for ${fairName}?`,
              (b) => `WhatsApp nudge sent to ${b.attempted} universities.`
            )
          }
          disabled={busy !== null}
          className="rounded-md border border-navy/20 px-4 py-2 text-sm font-medium text-navy hover:bg-navy/5 disabled:opacity-60"
        >
          {busy === "whatsapp"
            ? "Sending…"
            : "Send WhatsApp nudge (fair morning)"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-emerald-700">{msg}</p>}
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  );
}
