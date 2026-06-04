import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ProformaInvoicePDF } from "@/components/InvoiceView/ProformaInvoicePDF";
import { InvoicePDF } from "@/components/InvoicePDF";
import { fetchPublicItinerary } from "@/lib/itinerary";
import type { Registration, Invoice, Fair, BillingDetails } from "@/types";

/**
 * Server-side PDF rendering for email attachments. The proforma /
 * invoice PDF components are isomorphic (no "use client"); here we
 * render them to a Buffer with renderToBuffer so every communication
 * can carry the actual document, not just a link.
 *
 * nodejs runtime only (filesystem + react-pdf). All callers already
 * set `export const runtime = "nodejs"`.
 */

// The logo is a /public path that the browser resolves, but server-side
// react-pdf needs a real source — embed it as a data-URI once.
let cachedLogo: string | null = null;
function logoDataUri(): string {
  if (cachedLogo) return cachedLogo;
  const buf = readFileSync(
    join(process.cwd(), "public", "icons", "icon-512.png")
  );
  cachedLogo = `data:image/png;base64,${buf.toString("base64")}`;
  return cachedLogo;
}

export interface InvoiceAttachment {
  filename: string;
  content: Buffer;
}

/**
 * Render the registration's current document (proforma or tax invoice)
 * to a PDF attachment. Returns null on any failure so a render hiccup
 * never blocks the email itself from going out.
 */
export async function renderInvoiceAttachment(
  supabase: SupabaseClient,
  {
    registration,
    invoice,
    fair,
    billing,
  }: {
    registration: Registration;
    invoice: Invoice;
    fair: Fair;
    billing: BillingDetails | null;
  }
): Promise<InvoiceAttachment | null> {
  try {
    const itinerary = await fetchPublicItinerary(supabase, fair.id);
    const logoSrc = logoDataUri();

    const element =
      invoice.invoice_type === "PROFORMA" ? (
        <ProformaInvoicePDF
          registration={registration}
          invoice={invoice}
          fair={fair}
          billing={billing}
          itinerary={itinerary}
          logoSrc={logoSrc}
        />
      ) : (
        <InvoicePDF
          registration={registration}
          invoice={invoice}
          fair={fair}
          billing={billing}
          itinerary={itinerary}
          logoSrc={logoSrc}
        />
      );

    const content = await renderToBuffer(element);

    const ref =
      invoice.invoice_type === "PROFORMA"
        ? invoice.proforma_reference || "proforma"
        : invoice.invoice_number || "invoice";

    return { filename: `${ref}.pdf`, content };
  } catch (e) {
    console.error("renderInvoiceAttachment failed:", e);
    return null;
  }
}
