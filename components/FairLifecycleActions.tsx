"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { canTransition } from "@/lib/fairStatus";
import type { FairStatus } from "@/types";

interface Props {
  fairId: string;
  status: FairStatus;
  earlybirdDeadline?: string | null;
  registrationDeadline?: string | null;
  fairDateStart?: string | null;
  fairDateEnd?: string | null;
  unpaidCount: number;
  // v13 conclude status
  autoConcluded?: boolean;
  concludedAt?: string | null;
  thankyouSentAt?: string | null;
  statUniversities?: number | null;
  statStudents?: number | null;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nextDayLabel(end: string): string {
  const d = new Date(end);
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type ActionKind =
  | "publish"
  | "close-registration"
  | "start"
  | "conclude"
  | "archive"
  | "cancel";

const PROMPTS: Record<ActionKind, { title: string; body: string }> = {
  publish: {
    title: "Publish this fair?",
    body: "The fair page will go live at fairs.iaesgujarat.org and registrations will open.",
  },
  "close-registration": {
    title: "Close registration?",
    body: "No new university or institution registrations will be accepted. The fair page will show a 'registration closed' notice.",
  },
  start: {
    title: "Start the fair?",
    body: "QR scanning becomes active. Use this on the first day of the fair.",
  },
  conclude: {
    title: "Conclude the fair?",
    body: "Registrations are locked permanently and post-fair data export is enabled. This cannot be undone.",
  },
  archive: {
    title: "Archive this fair?",
    body: "Move the fair to historical records. Admin view only.",
  },
  cancel: {
    title: "Cancel this fair?",
    body: "Cancellation is permanent. Registered universities will need to be refunded per the cancellation policy. Please provide a reason.",
  },
};

export function FairLifecycleActions({
  fairId,
  status,
  earlybirdDeadline,
  registrationDeadline,
  fairDateStart,
  fairDateEnd,
  unpaidCount,
  autoConcluded,
  concludedAt,
  thankyouSentAt,
  statUniversities,
  statStudents,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<ActionKind | null>(null);
  const [confirming, setConfirming] = useState<ActionKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  async function run(action: ActionKind, body?: object) {
    setPending(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fairs/${fairId}/${action}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Action failed.");
      setConfirming(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setPending(null);
    }
  }

  const isCancel = confirming === "cancel";

  return (
    <div className="space-y-6">
      {/* Publish */}
      <Step
        index={1}
        title="Publish"
        description="Makes the fair page live at fairs.iaesgujarat.org and opens registrations."
      >
        <StepButton
          disabled={!canTransition(status, "PUBLISHED")}
          onClick={() => setConfirming("publish")}
          loading={pending === "publish"}
        >
          {status === "PUBLISHED" ||
          status === "REGISTRATION_CLOSED" ||
          status === "ONGOING" ||
          status === "COMPLETED" ||
          status === "ARCHIVED"
            ? "Already published"
            : "Publish fair →"}
        </StepButton>
      </Step>

      {/* Close registration */}
      <Step
        index={2}
        title="Close Registration"
        description={
          registrationDeadline
            ? `Manually close before ${new Date(
                registrationDeadline
              ).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}, or wait for it to auto-close.`
            : "Lock new registrations."
        }
      >
        <StepButton
          disabled={!canTransition(status, "REGISTRATION_CLOSED")}
          onClick={() => setConfirming("close-registration")}
          loading={pending === "close-registration"}
        >
          Close registration
        </StepButton>
      </Step>

      {/* Start */}
      <Step
        index={3}
        title="Start Fair"
        description={
          fairDateStart
            ? `Activate on ${new Date(fairDateStart).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}. QR scanning goes live.`
            : "Activate QR scanning."
        }
      >
        <StepButton
          disabled={!canTransition(status, "ONGOING")}
          onClick={() => setConfirming("start")}
          loading={pending === "start"}
        >
          ▶ Start fair
        </StepButton>
      </Step>

      {/* Conclude — auto at midnight IST; manual = emergency override */}
      <Step
        index={4}
        title="Conclude Fair"
        description={
          status === "COMPLETED"
            ? "Concluded. Stats cached and thank-you emails sent."
            : status === "ONGOING" && fairDateEnd
            ? `Auto-concludes at midnight IST on ${nextDayLabel(
                fairDateEnd
              )}. Use the button only as an emergency override.`
            : "Locks registrations, caches stats, and emails thank-yous to confirmed universities and checked-in students."
        }
      >
        {status === "COMPLETED" ? (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm">
            <p className="font-medium text-green-800">
              {autoConcluded
                ? "✅ Auto-concluded at midnight IST"
                : "✅ Manually concluded"}
              {concludedAt ? ` · ${fmtDateTime(concludedAt)}` : ""}
            </p>
            <p className="mt-1 text-xs text-green-700">
              Thank-you emails:{" "}
              {thankyouSentAt
                ? `sent ${fmtDateTime(thankyouSentAt)}`
                : "not recorded"}
              {statUniversities != null
                ? ` — ${statUniversities} universit${
                    statUniversities === 1 ? "y" : "ies"
                  }`
                : ""}
              {statStudents != null
                ? ` + ${statStudents.toLocaleString("en-IN")} students`
                : ""}
            </p>
          </div>
        ) : (
          <StepButton
            disabled={!canTransition(status, "COMPLETED")}
            onClick={() => setConfirming("conclude")}
            loading={pending === "conclude"}
          >
            ✓ Conclude now
          </StepButton>
        )}
      </Step>

      {/* Archive */}
      <Step
        index={5}
        title="Archive"
        description="Move to historical records (admin-only view)."
      >
        <StepButton
          disabled={!canTransition(status, "ARCHIVED")}
          onClick={() => setConfirming("archive")}
          loading={pending === "archive"}
        >
          Archive fair
        </StepButton>
      </Step>

      {/* Danger zone */}
      <div className="rounded-md border border-red-200 bg-red-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
          Danger zone
        </p>
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-sm text-red-900">
            Cancel this fair.{" "}
            {unpaidCount > 0 && (
              <span className="text-red-700">
                ({unpaidCount} unpaid registration{unpaidCount === 1 ? "" : "s"}{" "}
                affected.)
              </span>
            )}
          </p>
          <Button
            variant="outline"
            disabled={status === "CANCELLED" || status === "ARCHIVED"}
            onClick={() => setConfirming("cancel")}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            Cancel fair
          </Button>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-lg font-semibold text-navy">
              {PROMPTS[confirming].title}
            </h3>
            <p className="mt-2 text-sm text-navy/70">
              {PROMPTS[confirming].body}
            </p>
            {isCancel && (
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason (required)"
                rows={3}
                className="mt-3 block w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            )}
            {error && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirming(null);
                  setError(null);
                }}
                disabled={pending !== null}
              >
                Cancel
              </Button>
              <Button
                variant={isCancel ? "primary" : "gold"}
                loading={pending === confirming}
                disabled={isCancel && cancelReason.trim().length < 3}
                onClick={() =>
                  run(
                    confirming,
                    isCancel ? { reason: cancelReason.trim() } : undefined
                  )
                }
              >
                {isCancel ? "Cancel fair" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sanity-check pieces of info we accept but don't render */}
      <span hidden>{earlybirdDeadline}</span>
    </div>
  );
}

function Step({
  index,
  title,
  description,
  children,
}: {
  index: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-navy/10 bg-white p-5 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs uppercase tracking-wider text-navy/55">
          Step {index}
        </p>
        <p className="font-serif text-lg font-semibold text-navy">{title}</p>
        <p className="mt-0.5 text-sm text-navy/70">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function StepButton({
  disabled,
  onClick,
  loading,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={disabled ? "secondary" : "gold"}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
