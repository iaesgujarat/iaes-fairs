import type { BoothConfig, BoothPricing } from "@/types";

/**
 * Default booth allocation included in the base fee.
 *   1 table, 2 representatives.
 * Anything beyond this is charged as add-ons.
 */
export const BOOTH_DEFAULTS = {
  tables: 1,
  reps: 2,
} as const;

export const FALLBACK_EXTRA_TABLE_USD = 300;
export const FALLBACK_EXTRA_REP_USD = 100;
export const FALLBACK_MAX_TABLES = 3;

/**
 * Hard rule from T&C §2.3 — every table allows up to 2 representatives.
 */
export function getMaxReps(totalTables: number): number {
  return totalTables * 2;
}

/**
 * Server-side validation: enforce both stepper bounds and the T&C rep
 * cap. Mirrors what the BoothConfigurator UI enforces.
 */
export function validateBoothConfig(
  config: BoothConfig,
  maxTables: number = FALLBACK_MAX_TABLES
): { valid: boolean; error?: string } {
  if (!Number.isInteger(config.totalTables) || !Number.isInteger(config.totalReps)) {
    return { valid: false, error: "Tables and reps must be whole numbers." };
  }
  if (config.totalTables < BOOTH_DEFAULTS.tables || config.totalTables > maxTables) {
    return {
      valid: false,
      error: `Tables must be between ${BOOTH_DEFAULTS.tables} and ${maxTables}.`,
    };
  }
  const maxReps = getMaxReps(config.totalTables);
  if (config.totalReps < BOOTH_DEFAULTS.reps || config.totalReps > maxReps) {
    return {
      valid: false,
      error: `With ${config.totalTables} table(s), reps must be between ${BOOTH_DEFAULTS.reps} and ${maxReps} (2 per table maximum).`,
    };
  }
  return { valid: true };
}

/**
 * Pure pricing function — given a booth config and the active base
 * price (early-bird or standard), return the add-on breakdown plus the
 * grand total. Per spec: early-bird discount applies to the BASE FEE
 * only; add-ons are always at full rate.
 */
export function calculateBoothPricing(
  config: BoothConfig,
  basePriceUSD: number,
  priceExtraTableUSD: number = FALLBACK_EXTRA_TABLE_USD,
  priceExtraRepUSD: number = FALLBACK_EXTRA_REP_USD
): BoothPricing {
  const addonTables = Math.max(0, config.totalTables - BOOTH_DEFAULTS.tables);
  const addonReps = Math.max(0, config.totalReps - BOOTH_DEFAULTS.reps);

  const addonTablesCostUSD = round2(addonTables * priceExtraTableUSD);
  const addonRepsCostUSD = round2(addonReps * priceExtraRepUSD);
  const addonTotalCostUSD = round2(addonTablesCostUSD + addonRepsCostUSD);

  return {
    basePriceUSD: round2(basePriceUSD),
    addonTables,
    addonReps,
    addonTablesCostUSD,
    addonRepsCostUSD,
    addonTotalCostUSD,
    grandTotalUSD: round2(basePriceUSD + addonTotalCostUSD),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
