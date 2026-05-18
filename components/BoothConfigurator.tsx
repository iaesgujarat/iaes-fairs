"use client";

import { useEffect, useState } from "react";
import {
  calculateBoothPricing,
  getMaxReps,
  BOOTH_DEFAULTS,
} from "@/lib/booth";
import type { AddonTableStatus } from "@/types";

interface Props {
  /** Active per-booth fee (early-bird if applicable, else standard). */
  basePriceUSD: number;
  priceExtraTableUSD: number;
  priceExtraRepUSD: number;
  maxTables: number;
  /** Current configuration — driven by the parent form's state. */
  totalTables: number;
  totalReps: number;
  /** Notify the parent when either value changes. */
  onChange: (next: { totalTables: number; totalReps: number }) => void;
  /** v14 — when set, show the live shared add-on table pool counter
   *  and cap extra tables at maxAddonTablesPerReg (Standard/EB only). */
  fairId?: string;
  maxAddonTablesPerReg?: number;
}

export function BoothConfigurator({
  basePriceUSD,
  priceExtraTableUSD,
  priceExtraRepUSD,
  maxTables,
  totalTables,
  totalReps,
  onChange,
  fairId,
  maxAddonTablesPerReg = 1,
}: Props) {
  const maxReps = getMaxReps(totalTables);

  // v14 — live shared add-on table pool (Standard/Early-Bird only).
  const [pool, setPool] = useState<AddonTableStatus | null>(null);
  useEffect(() => {
    if (!fairId) return;
    let cancelled = false;
    fetch(`/api/fairs/${fairId}/addon-table-status`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setPool({
          fair_id: fairId,
          addon_tables_pool: d?.pool ?? 0,
          tables_taken: d?.taken ?? 0,
          tables_remaining: d?.remaining ?? 0,
          isPoolExhausted: !!d?.isPoolExhausted,
        });
      })
      .catch(() => {
        /* counter is UX-only; server enforces the real pool */
      });
    return () => {
      cancelled = true;
    };
  }, [fairId]);

  // Effective table ceiling: absolute cap, the per-reg add-on cap, and
  // (when the pool is exhausted) no extra table at all.
  const poolExhausted = !!fairId && pool?.isPoolExhausted === true;
  const effectiveMaxTables = Math.min(
    maxTables,
    BOOTH_DEFAULTS.tables + (poolExhausted ? 0 : maxAddonTablesPerReg)
  );

  // If the user reduces tables, auto-clamp reps to the new ceiling.
  useEffect(() => {
    if (totalReps > maxReps) {
      onChange({ totalTables, totalReps: maxReps });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxReps]);

  // If the pool drains while a user has an extra table queued, clamp.
  useEffect(() => {
    if (totalTables > effectiveMaxTables) {
      const t = effectiveMaxTables;
      onChange({ totalTables: t, totalReps: Math.min(totalReps, t * 2) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMaxTables]);

  const pricing = calculateBoothPricing(
    { totalTables, totalReps },
    basePriceUSD,
    priceExtraTableUSD,
    priceExtraRepUSD
  );

  function setTables(v: number) {
    const clamped = Math.min(
      Math.max(v, BOOTH_DEFAULTS.tables),
      effectiveMaxTables
    );
    const newMaxReps = clamped * 2;
    const clampedReps = Math.min(totalReps, newMaxReps);
    onChange({ totalTables: clamped, totalReps: clampedReps });
  }
  function setReps(v: number) {
    const clamped = Math.min(Math.max(v, BOOTH_DEFAULTS.reps), maxReps);
    onChange({ totalTables, totalReps: clamped });
  }

  return (
    <div className="space-y-5 rounded-xl border border-navy/10 bg-cream/40 p-6">
      <div>
        <h3 className="font-serif text-lg font-semibold text-navy">
          Booth configuration
        </h3>
        <p className="mt-0.5 text-xs text-navy/55">
          1 table and 2 representatives are included in the base fee. Add more
          below if you need them.
        </p>
      </div>

      {/* Tables stepper */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-navy">Tables / counters</p>
          <p className="mt-0.5 text-xs text-navy/55">
            1 included · +USD {priceExtraTableUSD} per extra (max{" "}
            {effectiveMaxTables})
          </p>
        </div>
        <Stepper
          value={totalTables}
          min={BOOTH_DEFAULTS.tables}
          max={effectiveMaxTables}
          onChange={setTables}
          ariaLabel="Number of tables"
        />
      </div>
      {fairId && pool && (
        <p
          className={`-mt-3 text-xs font-medium ${
            pool.isPoolExhausted
              ? "text-red-600"
              : pool.tables_remaining === 1
              ? "text-orange-500"
              : "text-navy/45"
          }`}
        >
          {pool.isPoolExhausted
            ? "⛔ No additional tables available for this fair"
            : `${pool.tables_remaining} of ${pool.addon_tables_pool} extra table slots remaining`}
        </p>
      )}
      {pricing.addonTables > 0 && (
        <p className="-mt-3 text-xs font-medium text-gold-600">
          +{pricing.addonTables} extra table
          {pricing.addonTables === 1 ? "" : "s"} · USD{" "}
          {pricing.addonTablesCostUSD.toLocaleString()} added
        </p>
      )}

      {/* Reps stepper */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-navy">Representatives</p>
          <p className="mt-0.5 text-xs text-navy/55">
            2 included · +USD {priceExtraRepUSD} per extra · max {maxReps} with{" "}
            {totalTables} table
            {totalTables === 1 ? "" : "s"} (2 per table)
          </p>
        </div>
        <Stepper
          value={totalReps}
          min={BOOTH_DEFAULTS.reps}
          max={maxReps}
          onChange={setReps}
          ariaLabel="Number of representatives"
        />
      </div>
      {pricing.addonReps > 0 && (
        <p className="-mt-3 text-xs font-medium text-gold-600">
          +{pricing.addonReps} extra rep
          {pricing.addonReps === 1 ? "" : "s"} · USD{" "}
          {pricing.addonRepsCostUSD.toLocaleString()} added
        </p>
      )}

      {/* Live price summary */}
      <div className="space-y-2 rounded-lg border border-navy/10 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy">
          Price summary
        </p>
        <Row
          label="Fair registration (1 table · 2 reps)"
          value={`USD ${pricing.basePriceUSD.toLocaleString()}`}
        />
        {pricing.addonTables > 0 && (
          <Row
            label={`Extra table × ${pricing.addonTables}`}
            value={`+ USD ${pricing.addonTablesCostUSD.toLocaleString()}`}
          />
        )}
        {pricing.addonReps > 0 && (
          <Row
            label={`Extra representative × ${pricing.addonReps}`}
            value={`+ USD ${pricing.addonRepsCostUSD.toLocaleString()}`}
          />
        )}
        <div className="flex items-baseline justify-between border-t border-navy/10 pt-2">
          <span className="text-sm font-semibold text-navy">Total (USD)</span>
          <span className="font-serif text-xl font-bold text-navy">
            USD {pricing.grandTotalUSD.toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-navy/50">
          If paying in INR, GST is added on the final invoice (18% for
          inter-state, 9%+9% for Gujarat-registered entities).
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-navy/65">{label}</span>
      <span className="font-medium text-navy">{value}</span>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="flex items-center gap-3"
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Decrease"
        className="h-8 w-8 rounded-full border border-navy/20 font-bold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy"
      >
        &minus;
      </button>
      <span className="w-6 text-center font-semibold tabular-nums text-navy">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase"
        className="h-8 w-8 rounded-full border border-navy/20 font-bold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy"
      >
        +
      </button>
    </div>
  );
}
