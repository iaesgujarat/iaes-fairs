import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { InvoiceActions } from "@/components/InvoiceActions";
import { InvoiceUSD } from "@/components/InvoiceView/InvoiceUSD";
import { InvoiceINR } from "@/components/InvoiceView/InvoiceINR";
import { formatINR, formatUSD, formatDateShort } from "@/lib/utils";
import { fetchPublicItinerary } from "@/lib/itinerary";
import type { Registration, Invoice, Fair, BillingDetails } from "@/types";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
}: {
  params: { registrationId: string };
}) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("registrations")
    .select(
      `*,
       fair:fairs(*),
       invoices:invoices(*),
       billing:billing_details(*)`
    )
    .eq("id", params.registrationId)
    .maybeSingle();

  if (!data) notFound();

  const allInvoices = (
    Array.isArray(data.invoices) ? data.invoices : [data.invoices]
  ) as (Invoice | null)[];
  // Prefer the TAX invoice if it exists (it's the one to display once
  // payment has been processed). Otherwise fall back to the proforma.
  const taxInvoice =
    allInvoices.find((i) => i && i.invoice_type === "TAX") ?? null;
  const proformaInvoice =
    allInvoices.find((i) => i && i.invoice_type === "PROFORMA") ?? null;
  const invoice = (taxInvoice ?? proformaInvoice) as Invoice | null;

  const fair = data.fair as Fair | null;
  const billing = (Array.isArray(data.billing)
    ? data.billing[0]
    : data.billing) as BillingDetails | null;

  if (!invoice || !fair) notFound();

  const registration = data as Registration;
  const itinerary = await fetchPublicItinerary(supabase, fair.id);
  const isINR = invoice.payment_currency === "INR";
  const isProforma = invoice.invoice_type === "PROFORMA";
  const gatewayActive = !!fair.payment_gateway_active;
  const isPaid =
    registration.status === "paid" || registration.status === "confirmed";
  const showPayButton = gatewayActive && !isProforma && !isPaid;

  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm text-navy/60 hover:text-navy">
            &larr; Back to home
          </Link>
          <StatusBadge status={registration.status} />
        </div>

        <Card>
          <CardContent className="px-8 py-8 sm:px-10 sm:py-10">
            {isProforma ? (
              <ProformaView
                registration={registration}
                invoice={invoice}
                fair={fair}
              />
            ) : isINR ? (
              <InvoiceINR
                registration={registration}
                invoice={invoice}
                fair={fair}
                billing={billing}
              />
            ) : (
              <InvoiceUSD
                registration={registration}
                invoice={invoice}
                fair={fair}
              />
            )}

            {isProforma && (
              <div className="mt-6 rounded-md border border-gold/40 bg-gold/5 p-4 text-sm text-navy">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold-600">
                  Payment gateway opening soon
                </p>
                <p className="mt-1.5 text-navy/85">
                  Your spot is reserved. We&rsquo;ll email you the moment
                  payment is open — you&rsquo;ll then return to this page to
                  complete payment and receive your Tax Invoice.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter>
            <InvoiceActions
              registration={registration}
              invoice={invoice}
              fair={fair}
              billing={billing}
              itinerary={itinerary}
              showPayButton={showPayButton}
            />
          </CardFooter>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}

// ----------------------------------------------------------------
// On-screen proforma view (no GST rows; "Indicative INR" note;
// disclaimer footer).
// ----------------------------------------------------------------
function ProformaView({
  registration,
  invoice,
  fair,
}: {
  registration: Registration;
  invoice: Invoice;
  fair: Fair;
}) {
  const total = Number(invoice.total_amount_usd ?? invoice.base_amount_usd ?? 0);
  const addonCost = Number(registration.addon_cost_usd || 0);
  const baseUSD = Number(invoice.base_amount_usd ?? 0) - addonCost;
  const addonTables = Number(registration.addon_tables || 0);
  const addonReps = Number(registration.addon_reps || 0);
  const extraTableUSD = Number(fair.price_extra_table_usd ?? 300);
  const extraRepUSD = Number(fair.price_extra_rep_usd ?? 100);
  const indicativeINR = Number(invoice.total_amount_inr || 0);
  const tierLabel =
    registration.pricing_tier === "EARLYBIRD" ? "Early Bird" : "Standard";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-navy/10 pb-6">
        <div>
          <p className="font-serif text-2xl font-semibold text-navy">IAES</p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-gold-500">
            International Education Fairs &middot; Gujarat
          </p>
        </div>
        <div className="text-right">
          <p className="font-serif text-2xl tracking-[0.18em] text-navy/70">
            PROFORMA INVOICE
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-gold-600">
            Not a Tax Invoice
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-navy/50">From</p>
          <p className="mt-2 font-medium text-navy">
            Indo American Education Society
          </p>
          <p className="text-sm text-navy/70">
            3rd Floor, 301-302, Sun Square, Navarangpura, Ahmedabad - 380009
          </p>
          <p className="text-sm text-navy/70">
            GSTIN: 24AAATI2674J1ZM &middot; PAN: AAATI2674J
          </p>
          <p className="text-sm text-navy/70">eduadviser@iaesgujarat.org</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-navy/50">
            Billed To
          </p>
          <p className="mt-2 font-medium text-navy">
            {registration.university_name}
          </p>
          <p className="text-sm text-navy/70">{registration.contact_name}</p>
          {registration.contact_title && (
            <p className="text-sm text-navy/70">{registration.contact_title}</p>
          )}
          <p className="text-sm text-navy/70">{registration.contact_email}</p>
        </div>
      </div>

      <div className="grid gap-6 rounded-md bg-cream/70 p-4 sm:grid-cols-3">
        <Meta
          label="Proforma Ref."
          value={invoice.proforma_reference || "—"}
        />
        <Meta label="Issued" value={formatDateShort(invoice.issued_at)} />
        <Meta label="Currency" value={invoice.payment_currency} />
      </div>

      <div className="overflow-hidden rounded-md border border-navy/10">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                SAC
              </th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                Amount (USD)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-navy/10">
              <td className="px-4 py-3 align-top text-navy/70">998596</td>
              <td className="px-4 py-3">
                Fair Registration &mdash; {tierLabel} (1 Counter · 2 Reps)
              </td>
              <td className="px-4 py-3 text-right">{formatUSD(baseUSD)}</td>
            </tr>
            {addonTables > 0 && (
              <tr className="border-b border-navy/10">
                <td className="px-4 py-3 align-top text-navy/70">998596</td>
                <td className="px-4 py-3">
                  Additional Table × {addonTables}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatUSD(addonTables * extraTableUSD)}
                </td>
              </tr>
            )}
            {addonReps > 0 && (
              <tr className="border-b border-navy/10">
                <td className="px-4 py-3 align-top text-navy/70">998596</td>
                <td className="px-4 py-3">
                  Additional Representative × {addonReps}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatUSD(addonReps * extraRepUSD)}
                </td>
              </tr>
            )}
            <tr className="bg-cream/70 font-semibold text-navy">
              <td className="px-4 py-3" />
              <td className="px-4 py-3">Total Payable</td>
              <td className="px-4 py-3 text-right text-base">
                {formatUSD(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {invoice.payment_currency === "INR" && indicativeINR > 0 && (
        <div className="rounded-md bg-cream/70 p-4 text-sm">
          <p className="font-medium text-navy">
            Indicative INR: {formatINR(indicativeINR)}
          </p>
          <p className="mt-1 text-xs text-navy/60">
            {invoice.forex_rate_used
              ? `1 USD ≈ ₹${Number(invoice.forex_rate_used).toFixed(2)} `
              : ""}
            {invoice.forex_rate_date
              ? `(as on ${formatDateShort(invoice.forex_rate_date)})`
              : ""}
            . Final amount + GST will be locked at the live rate on the date
            of payment.
          </p>
        </div>
      )}

      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold uppercase tracking-wider text-xs">
          This is not a Tax Invoice
        </p>
        <p className="mt-1.5 leading-relaxed">
          No GST has been charged on this Proforma. A Tax Invoice with the
          official invoice number and applicable GST will be issued upon
          receipt of payment.
        </p>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-navy/50">{label}</p>
      <p className="mt-1 font-semibold text-navy">{value}</p>
    </div>
  );
}
