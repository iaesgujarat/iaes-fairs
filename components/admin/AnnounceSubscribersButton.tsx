"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";

/**
 * v21 — admin "Announce to subscribers" panel. Pick audience + channel,
 * preview with a test send to yourself, then broadcast. WhatsApp goes to
 * the consented contact registry; email to subscribe-form leads. Both
 * deduped + STOP-aware server-side.
 */
export function AnnounceSubscribersButton({
  fairId,
  fairName,
}: {
  fairId: string;
  fairName: string;
}) {
  const [uni, setUni] = useState(true);
  const [stu, setStu] = useState(true);
  const [wa, setWa] = useState(true);
  const [email, setEmail] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [busy, setBusy] = useState<"test" | "all" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const audiences = [
    ...(uni ? ["university"] : []),
    ...(stu ? ["student"] : []),
  ];
  const channels = [...(wa ? ["whatsapp"] : []), ...(email ? ["email"] : [])];

  async function post(payload: object) {
    const res = await fetch(
      `/api/admin/fairs/${fairId}/announce-subscribers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || "Failed.");
    return body;
  }

  async function sendTest() {
    setBusy("test");
    setMsg(null);
    setErr(null);
    try {
      if (!testEmail && !testPhone)
        throw new Error("Enter a test email and/or WhatsApp number.");
      await post({
        channels,
        test: { email: testEmail || undefined, phone: testPhone || undefined },
      });
      setMsg("Test sent — check your inbox / WhatsApp before broadcasting.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }

  async function sendAll() {
    if (
      !window.confirm(
        `Broadcast the "${fairName}" announcement to ${audiences.join(
          " + "
        )} via ${channels.join(" + ")}? This messages real subscribers.`
      )
    )
      return;
    setBusy("all");
    setMsg(null);
    setErr(null);
    try {
      const b = await post({ audiences, channels });
      setMsg(
        `Done — WhatsApp: ${b.waSent ?? 0}, Email: ${b.emailSent ?? 0}. (Re-runs skip anyone already sent.)`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }

  const Check = ({
    on,
    set,
    label,
  }: {
    on: boolean;
    set: (v: boolean) => void;
    label: string;
  }) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-navy/85">
      <input
        type="checkbox"
        className="h-4 w-4 accent-navy"
        checked={on}
        onChange={(e) => set(e.target.checked)}
      />
      {label}
    </label>
  );

  return (
    <div className="rounded-lg border border-navy/10 bg-white p-4 shadow-card">
      <p className="text-sm font-semibold text-navy">
        Announce to subscribers (v21)
      </p>
      <p className="mt-0.5 text-xs text-navy/60">
        Broadcast this fair to the standing audience — WhatsApp to consented
        contacts, email to subscribe-form leads. Deduped &amp; STOP-aware.
      </p>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <div className="flex gap-4">
          <span className="text-xs uppercase tracking-wider text-navy/45">
            Audience
          </span>
          <Check on={uni} set={setUni} label="Universities" />
          <Check on={stu} set={setStu} label="Students" />
        </div>
        <div className="flex gap-4">
          <span className="text-xs uppercase tracking-wider text-navy/45">
            Channel
          </span>
          <Check on={wa} set={setWa} label="WhatsApp" />
          <Check on={email} set={setEmail} label="Email" />
        </div>
      </div>

      <div className="mt-4 rounded-md border border-navy/10 bg-cream/40 p-3">
        <p className="mb-2 text-xs font-medium text-navy/70">
          Preview first — send a test to yourself:
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            type="email"
            placeholder="your@email.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <Input
            type="tel"
            placeholder="+91… (your WhatsApp)"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={sendTest}
          disabled={busy !== null || channels.length === 0}
          className="mt-2 rounded-md border border-navy/20 px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy/5 disabled:opacity-60"
        >
          {busy === "test" ? "Sending test…" : "Send test to me"}
        </button>
      </div>

      <button
        type="button"
        onClick={sendAll}
        disabled={busy !== null || channels.length === 0 || audiences.length === 0}
        className="mt-3 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-60"
      >
        {busy === "all" ? "Broadcasting…" : "Broadcast to all subscribers"}
      </button>

      {msg && <p className="mt-2 text-xs text-emerald-700">{msg}</p>}
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  );
}
