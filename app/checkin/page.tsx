"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QRScanner } from "@/components/QRScanner";

const STORAGE_KEY = "iaes.checkin.pin";

interface CheckinResult {
  alreadyCheckedIn: boolean;
  passNumber: string;
  fullName: string;
  institutionName: string;
  fairName?: string;
  fairStatus?: string | null;
  checkedInAt?: string | null;
}

export default function CheckinPage() {
  const [pin, setPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [manual, setManual] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v) setPin(v);
    } catch {
      /* ignore */
    }
  }, []);

  async function checkin(passUuid: string) {
    if (!pin) return;
    setBusy(true);
    setScannerError(null);
    setManualError(null);
    try {
      const res = await fetch(`/api/checkin/${passUuid}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${pin}` },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          // Bad PIN — force the staff to re-enter
          localStorage.removeItem(STORAGE_KEY);
          setPin(null);
          setPinError("PIN was rejected. Re-enter it.");
        } else {
          setScannerError(data?.error || "Check-in failed.");
        }
        return;
      }
      setResult(data as CheckinResult);
    } catch (e) {
      setScannerError(
        e instanceof Error ? e.message : "Check-in failed."
      );
    } finally {
      setBusy(false);
    }
  }

  function onDecoded(text: string) {
    try {
      const u = new URL(text);
      const parts = u.pathname.split("/").filter(Boolean);
      const uuid = parts[parts.length - 1];
      if (!uuid) throw new Error("No pass UUID found.");
      checkin(uuid);
    } catch {
      const trimmed = text.trim();
      if (/^[0-9a-f-]{32,}$/i.test(trimmed)) {
        checkin(trimmed);
      } else {
        setScannerError("Unrecognised QR code. Please try again.");
      }
    }
  }

  async function manualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManualError(null);
    const v = manual.trim().toUpperCase();
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
      setManual("");
      checkin(body.passUuid);
    } catch (e) {
      setManualError(e instanceof Error ? e.message : "Lookup failed.");
    }
  }

  function changePin() {
    localStorage.removeItem(STORAGE_KEY);
    setPin(null);
    setPinInput("");
  }

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setPinError(null);
    const value = pinInput.trim();
    if (!value) {
      setPinError("PIN is required.");
      return;
    }
    try {
      const res = await fetch("/api/checkin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setPinError(body?.error || "Incorrect PIN.");
        return;
      }
      localStorage.setItem(STORAGE_KEY, value);
      setPin(value);
    } catch (e) {
      setPinError(e instanceof Error ? e.message : "Could not verify PIN.");
    }
  }

  // ----- PIN entry view -----
  if (!pin) {
    return (
      <main className="min-h-screen bg-navy text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
          <div className="text-center">
            <p className="font-serif text-2xl font-semibold text-white">IAES</p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-gold">
              Fair 2026 · Check-in
            </p>
          </div>

          <form
            onSubmit={submitPin}
            className="mt-10 rounded-2xl bg-white p-6 text-navy shadow-xl"
          >
            <h1 className="font-serif text-xl font-semibold text-navy">
              Enter check-in PIN
            </h1>
            <p className="mt-2 text-sm text-navy/70">
              IAES will share the PIN with door staff before the fair.
              It&rsquo;s remembered on this phone.
            </p>
            <div className="mt-5">
              <Input
                type="password"
                label="PIN"
                required
                autoComplete="off"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
              />
              {pinError && (
                <p className="mt-2 text-xs text-red-600">{pinError}</p>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="mt-5 w-full"
            >
              Continue
            </Button>
          </form>

          <Link
            href="/"
            className="mt-8 text-center text-xs text-white/55 hover:text-white"
          >
            &larr; Back to home
          </Link>
        </div>
      </main>
    );
  }

  // ----- Result view (after a scan) -----
  if (result) {
    return (
      <main className="min-h-screen bg-emerald-700 text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
          <div className="text-center">
            <p className="font-serif text-2xl font-semibold text-white">IAES</p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-gold">
              Fair Check-in
            </p>
          </div>

          <div className="mt-10 rounded-2xl bg-white p-6 text-center text-navy shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-7 w-7" />
            </div>
            <p className="mt-4 font-serif text-2xl font-semibold text-navy">
              {result.fullName}
            </p>
            <p className="mt-1 text-sm text-navy/70">
              {result.institutionName}
            </p>
            <p className="mt-4 font-mono text-sm font-semibold tracking-wide text-navy">
              {result.passNumber}
            </p>
            <p
              className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${
                result.alreadyCheckedIn
                  ? "bg-amber-50 text-amber-900"
                  : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {result.alreadyCheckedIn
                ? `✓ Already checked in${
                    result.checkedInAt
                      ? ` at ${new Date(result.checkedInAt).toLocaleTimeString(
                          "en-IN",
                          { hour: "2-digit", minute: "2-digit" }
                        )}`
                      : ""
                  }`
                : `✓ Checked in${
                    result.checkedInAt
                      ? ` · ${new Date(result.checkedInAt).toLocaleTimeString(
                          "en-IN",
                          { hour: "2-digit", minute: "2-digit" }
                        )}`
                      : ""
                  }`}
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              variant="gold"
              size="lg"
              onClick={() => setResult(null)}
            >
              <RefreshCw className="h-4 w-4" /> Scan next student
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ----- Scanner view -----
  return (
    <main className="min-h-screen bg-navy text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="font-serif text-base text-white">Check-in</p>
            <p className="text-white/55">Scan student passes at the door</p>
          </div>
          <button
            onClick={changePin}
            className="text-white/55 underline-offset-2 hover:text-white hover:underline"
          >
            Change PIN
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4 text-navy shadow-xl">
          {busy ? (
            <p className="py-12 text-center text-sm text-navy/55">
              Checking in…
            </p>
          ) : (
            <QRScanner
              onDecode={onDecoded}
              onError={() =>
                setScannerError(
                  "Could not start camera. Allow camera permission and reload."
                )
              }
            />
          )}
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
          <form onSubmit={manualSubmit} className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="FAIR-2026-0042"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              className="flex-1 rounded-md border border-white/20 bg-navy/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-gold focus:outline-none"
            />
            <Button type="submit" variant="gold" size="md" loading={busy}>
              Check in
            </Button>
          </form>
          {manualError && (
            <p className="mt-2 text-xs text-red-300">{manualError}</p>
          )}
        </div>
      </div>
    </main>
  );
}
