import { calculateGST, type GSTCalculation } from "@/lib/gst";
import { getLiveForexRate, type ForexRate } from "@/lib/forex";
import type { Currency } from "@/types";

/**
 * v8: opaque reference for proforma invoices. Format: PI-YYYY-XXXX,
 * where XXXX is a 4-char alphanumeric drawn from a confusables-free
 * alphabet (no 0/O/1/I etc).
 *
 * Important: this is NOT sequential and does NOT consume any DB
 * sequence — proforma invoices are not official records. The
 * `invoice_counter_inr` / `invoice_counter_usd` sequences are only
 * touched when a TAX invoice is generated inside the Razorpay webhook.
 */
export function generateProformaReference(): string {
  const year = new Date().getFullYear();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `PI-${year}-${suffix}`;
}

export interface BuildInvoiceFieldsInput {
  paymentCurrency: Currency;
  boothPriceUSD: number;
  payerState: string | null;
  isGSTRegistered: boolean;
}

/**
 * Combines forex fetch + GST calculation and shapes the result so it can
 * be inserted directly into the invoices table (the column names match).
 */
export async function buildInvoiceFields(input: BuildInvoiceFieldsInput): Promise<{
  forex: ForexRate;
  gst: GSTCalculation;
  row: {
    payment_currency: Currency;
    forex_rate_used: number | null;
    forex_rate_date: string | null;
    base_amount_usd: number;
    base_amount_inr: number | null;
    gst_type: GSTCalculation["gstType"];
    cgst_percent: number;
    cgst_amount: number;
    sgst_percent: number;
    sgst_amount: number;
    igst_percent: number;
    igst_amount: number;
    total_amount_usd: number | null;
    total_amount_inr: number | null;
  };
}> {
  const forex = await getLiveForexRate();
  const gst = calculateGST(
    input.paymentCurrency,
    input.boothPriceUSD,
    forex.rate,
    input.payerState,
    input.isGSTRegistered
  );

  const isINR = input.paymentCurrency === "INR";
  return {
    forex,
    gst,
    row: {
      payment_currency: input.paymentCurrency,
      forex_rate_used: isINR ? forex.rate : null,
      forex_rate_date: isINR ? forex.date : null,
      base_amount_usd: gst.baseAmountUSD,
      base_amount_inr: isINR ? gst.baseAmountINR : null,
      gst_type: gst.gstType,
      cgst_percent: gst.cgstPercent,
      cgst_amount: gst.cgstAmount,
      sgst_percent: gst.sgstPercent,
      sgst_amount: gst.sgstAmount,
      igst_percent: gst.igstPercent,
      igst_amount: gst.igstAmount,
      total_amount_usd: isINR ? null : gst.totalAmountUSD,
      total_amount_inr: isINR ? gst.totalAmountINR : null,
    },
  };
}

/**
 * Convert an integer rupee amount to Indian-numbering words.
 * Used on the INR tax invoice ("Amount in words: Rupees ...").
 */
export function rupeesToWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return "Rupees Zero Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
    "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
    "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(num: number): string {
    if (num < 20) return ones[num];
    const t = Math.floor(num / 10);
    const o = num % 10;
    return tens[t] + (o ? " " + ones[o] : "");
  }

  function threeDigits(num: number): string {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    const parts: string[] = [];
    if (h) parts.push(ones[h] + " Hundred");
    if (rest) parts.push(twoDigits(rest));
    return parts.join(" ");
  }

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(twoDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (rest) parts.push(threeDigits(rest));

  return "Rupees " + parts.join(" ") + " Only";
}
