import type { Fair, PricingTier } from "@/types";

export interface FairPricing {
  /** v3 spec field — STANDARD or EARLYBIRD */
  tier: PricingTier;
  /** Live USD price (tier-aware) */
  priceUSD: number;
  /** Live INR price (tier-aware); `null` if INR pricing not configured yet */
  priceINR: number | null;
  /** Same as `tier === 'EARLYBIRD'`; kept for readability */
  isEarlyBird: boolean;
  /** ISO date of the early-bird cutoff (null when not configured) */
  earlybirdDeadline: string | null;
  /** ISO date of overall registration cutoff (null when not configured) */
  registrationDeadline: string | null;

  // ---- view helpers (used on the landing card for strikethrough) -----------
  standardUSD: number;
  standardINR: number | null;
  earlybirdUSD: number | null;
  earlybirdINR: number | null;
  /** USD saved vs. standard (0 unless early-bird is active) */
  savingUSD: number;
}

/**
 * Resolve the currently-applicable university booth price for a fair.
 *
 * Falls back through the v3 fields (`price_standard_usd` etc.) down to
 * the v2 `booth_price_usd` so the helper is safe to call on rows from
 * either schema.
 *
 * The returned `tier` is what should be **locked into**
 * `registrations.pricing_tier` at submit time — even if the early-bird
 * deadline lapses afterwards.
 */
export function getFairPricing(fair: Fair, now: Date = new Date()): FairPricing {
  const standardUSD = fair.price_standard_usd ?? fair.booth_price_usd ?? 0;
  const standardINR = fair.price_standard_inr ?? null;
  const earlybirdUSD = fair.price_earlybird_usd ?? null;
  const earlybirdINR = fair.price_earlybird_inr ?? null;
  const earlybirdDeadline = fair.earlybird_deadline ?? null;
  const registrationDeadline = fair.registration_deadline ?? null;

  const isEarlyBird =
    !!earlybirdDeadline &&
    !!earlybirdUSD &&
    new Date(earlybirdDeadline).getTime() >= startOfDay(now).getTime();

  const priceUSD = isEarlyBird && earlybirdUSD ? earlybirdUSD : standardUSD;
  const priceINR = isEarlyBird ? earlybirdINR : standardINR;
  const savingUSD =
    isEarlyBird && earlybirdUSD ? Math.max(standardUSD - earlybirdUSD, 0) : 0;

  return {
    tier: isEarlyBird ? "EARLYBIRD" : "STANDARD",
    priceUSD,
    priceINR,
    isEarlyBird,
    earlybirdDeadline,
    registrationDeadline,
    standardUSD,
    standardINR,
    earlybirdUSD,
    earlybirdINR,
    savingUSD,
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
