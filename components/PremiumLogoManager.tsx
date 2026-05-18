"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function PremiumLogoManager({
  registrationId,
  backdropReceived,
  backdropUrl,
}: {
  registrationId: string;
  backdropReceived: boolean;
  backdropUrl: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErr("Choose a PNG file first.");
      return;
    }
    setUploading(true);
    setErr(null);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/admin/registrations/${registrationId}/logo`,
        { method: "POST", body: fd }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed.");
      setMsg("Logo uploaded — university notified.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function sendReminder() {
    setReminding(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/registrations/${registrationId}/send-logo-reminder`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reminder failed.");
      setMsg("Reminder email sent.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reminder failed.");
    } finally {
      setReminding(false);
    }
  }

  return (
    <div className="rounded-lg border border-navy/10 bg-white p-5 shadow-card">
      <p className="text-xs uppercase tracking-wider text-navy/55">
        Logo status
      </p>
      <p className="mt-1 text-sm font-medium">
        {backdropReceived ? (
          <span className="text-emerald-700">✅ Received</span>
        ) : (
          <span className="text-amber-700">⏳ Awaiting logo</span>
        )}
      </p>

      {backdropReceived && backdropUrl && (
        <a
          href={backdropUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-navy underline underline-offset-2"
        >
          View / download uploaded logo ↗
        </a>
      )}

      <div className="mt-4 space-y-3 border-t border-navy/10 pt-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-navy/55">
            Upload logo (PNG received by email)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/*"
            className="mt-1 block w-full text-sm text-navy file:mr-3 file:rounded-md file:border file:border-navy/15 file:bg-cream file:px-3 file:py-1.5 file:text-sm file:text-navy"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="gold" loading={uploading} onClick={upload}>
            {backdropReceived ? "Replace logo" : "Upload logo"}
          </Button>
          {!backdropReceived && (
            <Button
              size="sm"
              variant="secondary"
              loading={reminding}
              onClick={sendReminder}
            >
              Send logo reminder
            </Button>
          )}
        </div>
        {msg && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {msg}
          </p>
        )}
        {err && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {err}
          </p>
        )}
      </div>
    </div>
  );
}
