"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QRScanner } from "@/components/QRScanner";
import { InstallHint } from "@/components/InstallHint";

const STORAGE_KEY = "iaes.scan.university";

interface ScannerIdentity {
  registrationId: string;
  universityName: string;
  invoiceNumber: string;
}

export default function ScanLandingPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState<ScannerIdentity | null>(null);
  const [invoiceInput, setInvoiceInput] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualPassNumber, setManualPassNumber] = useState("");
  const [manualPassError, setManualPassError] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [binding, setBinding] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setIdentity(JSON.parse(raw) as ScannerIdentity);
    } catch {
      /* ignore parse errors */
    }
  }, []);

  // Pre-bound "ready" link: /scan?b=<registrationId>. Auto-resolves the
  // booth and binds it on this device so reps skip the invoice step on
  // fair day. Falls back to manual entry if the link can't be resolved.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const b = params.get("b");
    if (!b) return;
    setBinding(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/scan/by-registration?reg=${encodeURIComponent(b)}`
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Could not connect booth.");
        const next: ScannerIdentity = {
          registrationId: body.registrationId,
          universityName: body.universityName,
          invoiceNumber: body.invoiceNumber,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setIdentity(next);
      } catch (e) {
        setError(
          e instanceof Error
            ? `${e.message} Enter your invoice number below.`
            : "Could not connect your booth from the link. Enter your invoice number below."
        );
      } finally {
        setBinding(false);
        // Drop ?b= so a refresh/bookmark doesn't re-run the bind.
        window.history.replaceState({}, "", "/scan");
      }
    })();
  }, []);

  // Live "N contacts saved" badge. Refreshes whenever the scanner home
  // mounts (rep returns here after each save), so it stays current.
  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    fetch(
      `/api/scan/count?reg=${encodeURIComponent(identity.registrationId)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && typeof d?.count === "number") {
          setSavedCount(d.count);
        }
      })
      .catch(() => {
        /* badge is best-effort — never block scanning */
      });
    return () => {
      cancelled = true;
    };
  }, [identity]);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!invoiceInput.trim()) return;
    setLookingUp(true);
    try {
      const res = await fetch(
        `/api/scan/by-invoice?number=${encodeURIComponent(invoiceInput.trim())}`
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Lookup failed.");
      const next: ScannerIdentity = {
        registrationId: body.registrationId,
        universityName: body.universityName,
        invoiceNumber: body.invoiceNumber,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setIdentity(next);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not look up invoice."
      );
    } finally {
      setLookingUp(false);
    }
  }

  function signOut() {
    localStorage.removeItem(STORAGE_KEY);
    setIdentity(null);
  }

  function onDecoded(text: string) {
    // Pass URL looks like https://.../scan/<uuid>. Extract the last path part.
    try {
      const u = new URL(text);
      const parts = u.pathname.split("/").filter(Boolean);
      const uuid = parts[parts.length - 1];
      if (!uuid) throw new Error("No pass UUID found in scan.");
      router.push(`/scan/${uuid}`);
    } catch {
      // Not a URL — maybe a raw UUID
      const trimmed = text.trim();
      if (/^[0-9a-f-]{32,}$/i.test(trimmed)) {
        router.push(`/scan/${trimmed}`);
      } else {
        setScannerError("Unrecognised QR code. Please re-scan.");
      }
    }
  }

  async function onManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManualPassError(null);
    const v = manualPassNumber.trim().toUpperCase();
    if (!v) return;
    try {
      const res = await fetch(
        `/api/scan/by-pass-number?number=${encodeURIComponent(v)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Pass not found.");
      }
      const body = (await res.json()) as { passUuid: string };
      router.push(`/scan/${body.passUuid}`);
    } catch (e) {
      setManualPassError(
        e instanceof Error ? e.message : "Could not find pass."
      );
    }
  }

  if (!identity && binding) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy text-white">
        <div className="text-center">
          <p className="font-serif text-2xl font-semibold">IAES</p>
          <p className="mt-3 animate-pulse text-sm text-white/70">
            Connecting your booth…
          </p>
        </div>
      </main>
    );
  }

  if (!identity) {
    return (
      <main className="min-h-screen bg-navy text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
          <div className="text-center">
            <p className="font-serif text-2xl font-semibold text-white">IAES</p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-gold">
              Fair 2026 · Scanner
            </p>
          </div>

          <div className="mt-10 rounded-2xl bg-white p-6 text-navy shadow-xl">
            <h1 className="font-serif text-xl font-semibold text-navy">
              Connect your booth
            </h1>
            <p className="mt-2 text-sm text-navy/70">
              Enter your invoice number once. We&rsquo;ll remember your
              university on this phone, so every scan is recorded under your
              booth.
            </p>

            <form onSubmit={lookup} className="mt-6 space-y-4">
              <Input
                label="Invoice Number"
                required
                placeholder="IAES-FAIR-USD-2026-001"
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value)}
                hint="From the invoice/confirmation email you received."
              />
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={lookingUp}
                className="w-full"
              >
                Continue
              </Button>
            </form>
          </div>

          <Link
            href="/guide"
            className="mt-8 text-center text-xs text-gold hover:text-gold/80"
          >
            How does scanning work? Read the guide &rarr;
          </Link>
          <Link
            href="/"
            className="mt-3 text-center text-xs text-white/55 hover:text-white"
          >
            &larr; Back to home
          </Link>
        </div>
        <InstallHint />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-navy text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="font-serif text-base text-white">
              {identity.universityName}
            </p>
            <p className="text-white/55">{identity.invoiceNumber}</p>
            {savedCount !== null && (
              <p className="mt-0.5 font-medium text-gold">
                {savedCount} contact{savedCount === 1 ? "" : "s"} saved
              </p>
            )}
          </div>
          <button
            onClick={signOut}
            className="text-white/55 underline-offset-2 hover:text-white hover:underline"
          >
            Switch booth
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4 text-navy shadow-xl">
          <QRScanner
            onDecode={onDecoded}
            onError={() =>
              setScannerError(
                "Could not start camera. Allow camera permission and reload."
              )
            }
          />
          {scannerError && (
            <p className="mt-3 text-center text-xs text-red-600">
              {scannerError}
            </p>
          )}
          <p className="mt-2 text-center text-xs text-navy/55">
            Point at the student&rsquo;s QR code.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-white/15 bg-white/5 p-5 text-sm">
          <p className="text-xs uppercase tracking-wider text-white/55">
            Or enter pass ID manually
          </p>
          <form onSubmit={onManualSubmit} className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="FAIR-2026-0042"
              value={manualPassNumber}
              onChange={(e) => setManualPassNumber(e.target.value)}
              className="flex-1 rounded-md border border-white/20 bg-navy/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-gold focus:outline-none"
            />
            <Button type="submit" variant="gold" size="md">
              Go
            </Button>
          </form>
          {manualPassError && (
            <p className="mt-2 text-xs text-red-300">{manualPassError}</p>
          )}
        </div>

        <Link
          href={`/portal/${identity.registrationId}/students`}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
        >
          View My Saved List
          {savedCount !== null ? ` (${savedCount})` : ""} &rarr;
        </Link>
      </div>
      <InstallHint />
    </main>
  );
}
