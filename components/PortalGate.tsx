"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function PortalGate({
  registrationId,
  universityName,
  fairName,
}: {
  registrationId: string;
  universityName: string;
  fairName: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (code.replace(/\D/g, "").length !== 4) {
      setError("Enter the 4 digits.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/portal/${registrationId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ last4: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Verification failed.");
      router.refresh(); // server re-renders with the access cookie set
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-navy/10 bg-white p-8 shadow-card">
      <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
        {fairName}
      </p>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-navy">
        Your student leads
      </h1>
      <p className="mt-1 text-sm text-navy/70">{universityName}</p>

      <form onSubmit={submit} className="mt-6">
        <label
          htmlFor="portal-code"
          className="block text-sm font-medium text-navy"
        >
          Enter the last 4 digits of your registered phone
        </label>
        <input
          id="portal-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
          placeholder="••••"
          autoFocus
          className="mt-2 block w-full rounded-md border border-navy/15 bg-white px-3 py-3 text-center text-2xl tracking-[0.5em] text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/30"
        />

        {error && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={busy}
          className="mt-5 w-full"
        >
          Continue &rarr;
        </Button>
      </form>

      <p className="mt-5 text-xs text-navy/50">
        This is the phone number used when registering for the fair. Don&rsquo;t
        have it?{" "}
        <a
          href="mailto:eduadviser@iaesgujarat.org"
          className="text-navy underline underline-offset-2"
        >
          eduadviser@iaesgujarat.org
        </a>
      </p>
    </div>
  );
}
