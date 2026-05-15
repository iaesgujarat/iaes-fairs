import type { Currency, GSTType } from "@/types";

export interface GSTCalculation {
  gstType: GSTType;
  baseAmountUSD: number;
  baseAmountINR: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  totalAmountINR: number;
  totalAmountUSD: number;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * GST is determined by payer's state, not GSTIN prefix.
 *   Gujarat payer (intra-state) → CGST 9% + SGST 9%
 *   Other Indian state         → IGST 18%
 *   USD payer (export)          → NONE (zero-rated)
 */
export function calculateGST(
  paymentCurrency: Currency,
  baseAmountUSD: number,
  forexRate: number,
  payerState: string | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isGSTRegistered: boolean
): GSTCalculation {
  const baseUSD = r2(baseAmountUSD);

  if (paymentCurrency === "USD") {
    return {
      gstType: "NONE",
      baseAmountUSD: baseUSD,
      baseAmountINR: 0,
      cgstPercent: 0,
      cgstAmount: 0,
      sgstPercent: 0,
      sgstAmount: 0,
      igstPercent: 0,
      igstAmount: 0,
      totalAmountINR: 0,
      totalAmountUSD: baseUSD,
    };
  }

  const baseINR = r2(baseUSD * forexRate);
  const isGujarat = payerState?.trim().toLowerCase() === "gujarat";

  if (isGujarat) {
    const cgstAmount = r2(baseINR * 0.09);
    const sgstAmount = r2(baseINR * 0.09);
    return {
      gstType: "CGST_SGST",
      baseAmountUSD: baseUSD,
      baseAmountINR: baseINR,
      cgstPercent: 9,
      cgstAmount,
      sgstPercent: 9,
      sgstAmount,
      igstPercent: 0,
      igstAmount: 0,
      totalAmountINR: r2(baseINR + cgstAmount + sgstAmount),
      totalAmountUSD: 0,
    };
  }

  const igstAmount = r2(baseINR * 0.18);
  return {
    gstType: "IGST",
    baseAmountUSD: baseUSD,
    baseAmountINR: baseINR,
    cgstPercent: 0,
    cgstAmount: 0,
    sgstPercent: 0,
    sgstAmount: 0,
    igstPercent: 18,
    igstAmount,
    totalAmountINR: r2(baseINR + igstAmount),
    totalAmountUSD: 0,
  };
}
