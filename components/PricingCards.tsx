"use client";

import { useEffect, useState } from "react";
import { getActivePricingState, getFairPricing } from "@/lib/pricing";
import { formatUSD } from "@/lib/utils";
import type { Fair, PricingTier } from "@/types";

interface SlotInfo {
  total: number | null;
  remaining: number | null;
  isSoldOut: boolean;
}

const STD_EB_FEATURES = [
  "1 table (add 1 more for +$300)",
  "2 reps (add up to 2 more for +$100 each)",
  "Fair directory listing",
  "Transport & meals included",
];

const PREMIUM_FEATURES = [
  "2 tables (no add-ons needed)",
  "4 representatives",
  "Branded backdrop at booth",
  "Logo in print advertisements",
  "Dedicated social media campaign",
  "Vernacular language volunteer",
  "Transport & meals included",
];

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PricingCards({
  fair,
  selectedTier,
  onSelect,
}: {
  fair: Fair;
  selectedTier: PricingTier | null;
  onSelect: (tier: PricingTier) => void;
}) {
  const [slots, setSlots] = useState<SlotInfo | null>(null);
  const pricing = getFairPricing(fair);
  const state = getActivePricingState(fair);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/fairs/${fair.id}/premium-slots`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setSlots({
            total: d?.total ?? null,
            remaining: d?.remaining ?? null,
            isSoldOut: !!d?.isSoldOut,
          });
        }
      })
      .catch(() => {
        /* counter is UX-only; server is the source of truth */
      });
    return () => {
      cancelled = true;
    };
  }, [fair.id]);

  const card =
    "relative rounded-2xl border-2 p-5 text-left transition-all";
  const featureList = (items: string[], cls: string) => (
    <ul className={`mt-4 space-y-1.5 text-xs ${cls}`}>
      {items.map((f) => (
        <li key={f}>✓ {f}</li>
      ))}
    </ul>
  );

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium text-navy">
        Select Booth Type <span className="text-gold-500">*</span>
      </legend>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* ── EARLY BIRD ─────────────────────────────── */}
        {state.showEarlyBird && (
          <button
            type="button"
            onClick={() => onSelect("EARLYBIRD")}
            className={`${card} ${
              selectedTier === "EARLYBIRD"
                ? "border-navy bg-navy text-white"
                : "border-gold/50 bg-gold/5 hover:border-gold hover:shadow-md"
            }`}
          >
            <span className="mb-3 inline-flex items-center rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold text-navy">
              ⭐ EARLY BIRD
            </span>
            <p className="text-2xl font-bold">
              {formatUSD(pricing.earlybirdUSD ?? pricing.standardUSD)}
            </p>
            <p className="mt-0.5 text-xs opacity-60">
              Ends {fmtDate(fair.earlybird_deadline)}
            </p>
            {featureList(
              STD_EB_FEATURES,
              selectedTier === "EARLYBIRD" ? "opacity-80" : "text-navy/70"
            )}
          </button>
        )}

        {/* ── STANDARD (passive during early bird) ───── */}
        <div
          role={state.standardIsPassive ? undefined : "button"}
          tabIndex={state.standardIsPassive ? undefined : 0}
          onClick={() =>
            !state.standardIsPassive && onSelect("STANDARD")
          }
          onKeyDown={(e) => {
            if (
              !state.standardIsPassive &&
              (e.key === "Enter" || e.key === " ")
            ) {
              e.preventDefault();
              onSelect("STANDARD");
            }
          }}
          className={`${card} ${
            state.standardIsPassive
              ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
              : selectedTier === "STANDARD"
              ? "cursor-pointer border-navy bg-navy text-white"
              : "cursor-pointer border-navy/20 bg-white hover:border-navy hover:shadow-md"
          }`}
        >
          <span
            className={`mb-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
              state.standardIsPassive
                ? "bg-gray-200 text-gray-500"
                : "bg-navy/10 text-navy"
            }`}
          >
            {state.standardIsPassive
              ? `Opens ${fmtDate(fair.earlybird_deadline)}`
              : "STANDARD"}
          </span>
          <p
            className={`text-2xl font-bold ${
              selectedTier === "STANDARD" && !state.standardIsPassive
                ? ""
                : "text-navy"
            }`}
          >
            {formatUSD(pricing.standardUSD)}
          </p>
          <p className="mt-0.5 text-xs text-navy/40">
            Until {fmtDate(fair.registration_deadline)}
          </p>
          {featureList(STD_EB_FEATURES, "text-navy/60")}
        </div>

        {/* ── PREMIUM ────────────────────────────────── */}
        {state.showPremium && (
          <button
            type="button"
            disabled={slots?.isSoldOut ?? false}
            onClick={() => onSelect("PREMIUM")}
            className={`${card} ${
              slots?.isSoldOut
                ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-50"
                : selectedTier === "PREMIUM"
                ? "border-gold bg-navy text-white"
                : "border-gold/60 bg-gradient-to-br from-navy/5 to-gold/10 hover:border-gold hover:shadow-md"
            }`}
          >
            <span className="mb-3 inline-flex items-center rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold text-navy">
              💎 PREMIUM
            </span>
            <p
              className={`text-2xl font-bold ${
                selectedTier === "PREMIUM" ? "" : "text-navy"
              }`}
            >
              {formatUSD(fair.price_premium_usd ?? 2500)}
            </p>
            <p
              className={`mt-1 text-xs font-semibold ${
                slots?.isSoldOut
                  ? "text-red-600"
                  : slots?.remaining === 1
                  ? "text-red-500"
                  : selectedTier === "PREMIUM"
                  ? "text-gold"
                  : "text-gold-600"
              }`}
            >
              {slots
                ? slots.isSoldOut
                  ? "⛔ Sold out"
                  : slots.remaining != null && slots.total != null
                  ? `${slots.remaining} of ${slots.total} slots remaining`
                  : `${fair.premium_slots_total ?? 4} slots available`
                : "Checking availability…"}
            </p>
            {featureList(
              PREMIUM_FEATURES,
              selectedTier === "PREMIUM" ? "opacity-80" : "text-navy/75"
            )}
            <p
              className={`mt-3 text-[10px] ${
                selectedTier === "PREMIUM" ? "opacity-60" : "text-navy/40"
              }`}
            >
              Closes {fmtDate(fair.premium_deadline)}
            </p>
          </button>
        )}
      </div>

      {selectedTier === "PREMIUM" && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-xs text-navy/80">
          <strong>Logo required:</strong> after registering, email your
          university logo (PNG, min 300 dpi, transparent background
          preferred) to{" "}
          <a
            href="mailto:educationfair@iaesgujarat.org"
            className="font-medium underline"
          >
            educationfair@iaesgujarat.org
          </a>{" "}
          by {fmtDate(fair.premium_deadline)}.
        </div>
      )}
    </fieldset>
  );
}
