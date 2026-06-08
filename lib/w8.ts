import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Currency } from "@/types";

/**
 * IAES's signed W-8BEN-E — "Certificate of Foreign Status of Beneficial
 * Owner for United States Tax Withholding and Reporting (Entities)".
 *
 * US universities' AP / tax teams require a vendor's Certificate of
 * Foreign Status on file before paying a foreign supplier. We attach this
 * to USD proforma / invoice emails (and offer a gated download on the
 * invoice page) so the rep no longer has to forward it separately.
 *
 * SIGNED TAX DOCUMENT (carries signature + tax IDs): it must NEVER be
 * exposed at a public/guessable URL. It ships ONLY as an email attachment
 * or via the registration-gated download route — both nodejs runtime, so
 * filesystem access is available. The source PDF lives under docs/ (not
 * public/) and is pulled into each function bundle via
 * experimental.outputFileTracingIncludes in next.config.mjs.
 *
 * Scope: USD documents only. INR / India-office invoices are domestic and
 * do not need a US tax form.
 */
const W8_PATH = join(process.cwd(), "docs", "w8bene-06-08-2026.pdf");
const W8_FILENAME = "IAES-W-8BEN-E.pdf";

let cached: Buffer | null = null;

function w8Buffer(): Buffer | null {
  if (cached) return cached;
  try {
    cached = readFileSync(W8_PATH);
    return cached;
  } catch (e) {
    // Never let a missing/unreadable form block the email itself.
    console.error("w8Buffer: failed to read W-8BEN-E PDF:", e);
    return null;
  }
}

export interface W8Attachment {
  filename: string;
  content: Buffer;
}

/**
 * W-8BEN-E email attachment for USD documents. Returns null for INR (no US
 * form needed) or if the PDF can't be read, so callers can spread it into
 * an attachments array with `.filter(Boolean)`.
 */
export function w8Attachment(currency: Currency): W8Attachment | null {
  if (currency !== "USD") return null;
  const content = w8Buffer();
  return content ? { filename: W8_FILENAME, content } : null;
}

/** Raw bytes + filename for the gated download route. */
export function w8Download(): W8Attachment | null {
  const content = w8Buffer();
  return content ? { filename: W8_FILENAME, content } : null;
}
