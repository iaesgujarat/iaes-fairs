"use client";

import { useState } from "react";

function CopyRow({ label, hint, url }: { label: string; hint: string; url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  }
  return (
    <div>
      <p className="text-xs font-medium text-navy/75">{label}</p>
      <p className="text-[11px] text-navy/50">{hint}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border border-navy/15 bg-cream/40 px-3 py-2 font-mono text-xs text-navy/80"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md border border-navy/15 px-3 py-2 text-xs font-medium text-navy hover:bg-navy/5"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md border border-navy/15 px-3 py-2 text-xs font-medium text-navy hover:bg-navy/5"
        >
          Open
        </a>
      </div>
    </div>
  );
}

/**
 * The two individual links to hand a university: the pre-bound fair-day
 * scan link and their leads portal. Verify (Open) before sharing.
 */
export function BoothLinks({
  scanUrl,
  portalUrl,
}: {
  scanUrl: string;
  portalUrl: string;
}) {
  return (
    <div className="rounded-lg border border-navy/10 bg-white p-5 shadow-card">
      <p className="text-xs uppercase tracking-wider text-navy/55">
        Booth links
      </p>
      <p className="mb-4 mt-1 text-xs text-navy/50">
        Share these with the university. The scan link is pre-bound to their
        booth — one tap and they scan, no invoice number needed. Verify with{" "}
        <strong>Open</strong> before sending.
      </p>
      <div className="space-y-4">
        <CopyRow
          label="Scan link — fair day"
          hint="One tap → start scanning student QRs. No setup."
          url={scanUrl}
        />
        <CopyRow
          label="Leads portal — after the fair"
          hint="Their captured leads + CSV. Gated by last 4 digits of their phone."
          url={portalUrl}
        />
      </div>
    </div>
  );
}
