"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Result {
  ok?: boolean;
  sent?: number;
  skipped?: number;
  failed?: number;
  testOnly?: boolean;
  error?: string;
}

interface Props {
  path: string;
  body?: Record<string, unknown>;
  label: string;
  testLabel?: string;
  variant?: "primary" | "gold" | "outline";
  /** When true, ask for confirm() before firing the real send. */
  confirmBeforeSend?: boolean;
  confirmText?: string;
}

/**
 * Two-button block: "Send Test" (always goes only to TEST_RECIPIENT)
 * and the real send button. Used on the announce / reminders pages.
 */
export function SendActionButton({
  path,
  body,
  label,
  testLabel = "Send test to me first",
  variant = "gold",
  confirmBeforeSend = true,
  confirmText,
}: Props) {
  const router = useRouter();
  const [busyKind, setBusyKind] = useState<"test" | "real" | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function fire(testOnly: boolean) {
    if (
      !testOnly &&
      confirmBeforeSend &&
      typeof window !== "undefined" &&
      !confirm(
        confirmText || "This will send real emails. Are you sure?"
      )
    )
      return;
    setBusyKind(testOnly ? "test" : "real");
    setResult(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(body || {}), testOnly }),
      });
      const data = (await res.json()) as Result;
      if (!res.ok) {
        setResult({ error: data?.error || "Send failed." });
      } else {
        setResult(data);
        if (!testOnly) router.refresh();
      }
    } catch (e) {
      setResult({
        error: e instanceof Error ? e.message : "Send failed.",
      });
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          loading={busyKind === "test"}
          onClick={() => fire(true)}
        >
          {testLabel}
        </Button>
        <Button
          type="button"
          variant={variant}
          loading={busyKind === "real"}
          onClick={() => fire(false)}
        >
          {label}
        </Button>
      </div>
      {result?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {result.error}
        </div>
      )}
      {result?.ok && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {result.testOnly ? (
            <>Test email sent.</>
          ) : (
            <>
              Sent {result.sent ?? 0}
              {result.skipped ? `, skipped ${result.skipped}` : ""}
              {result.failed ? `, failed ${result.failed}` : ""}.
            </>
          )}
        </div>
      )}
    </div>
  );
}
