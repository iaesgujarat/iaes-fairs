import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/Card";
import { InvoiceActions } from "@/components/InvoiceActions";
import { formatINR, formatUSD, formatDate } from "@/lib/utils";
import { fetchPublicItinerary } from "@/lib/itinerary";
import type { Registration, Invoice, Fair, BillingDetails } from "@/types";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
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
  // Prefer TAX (post-payment) if it exists; otherwise show proforma state.
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
  const isProforma = invoice.invoice_type === "PROFORMA";
  const isINR = invoice.payment_currency === "INR";

  // Proforma view — "You're registered, payment opens soon"
  if (isProforma) {
    const amountLabel = isINR
      ? `${formatINR(Number(invoice.total_amount_inr || 0))}*`
      : formatUSD(Number(invoice.total_amount_usd || 0));

    return (
      <>
        <SiteHeader variant="light" />
        <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
          <Card>
            <CardContent className="space-y-8 px-8 py-10 text-center sm:px-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/20 text-gold-600">
                <Clock className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
                  You&rsquo;re Registered
                </p>
                <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
                  Your spot is reserved.
                </h1>
                <p className="mt-3 text-navy/70">
                  {registration.university_name} is registered for{" "}
                  <strong>{fair.name}</strong>. We&rsquo;ll email you the
                  moment payment opens.
                </p>
              </div>

              <div className="grid gap-4 rounded-md border border-navy/10 bg-cream/60 p-6 text-left text-sm">
                <Row label="University" value={registration.university_name} />
                <Row label="Fair" value={fair.name} />
                <Row label="Date" value={formatDate(fair.fair_date)} />
                <Row label="Venue" value={fair.venue || fair.city} />
                <Row
                  label="Booth"
                  value={`${registration.total_tables} table${
                    registration.total_tables === 1 ? "" : "s"
                  } · ${registration.total_reps} representative${
                    registration.total_reps === 1 ? "" : "s"
                  }`}
                />
                <Row
                  label="Proforma Ref."
                  value={invoice.proforma_reference || "—"}
                />
                <Row label="Amount Due" value={amountLabel} bold />
              </div>

              {isINR && (
                <p className="text-xs text-navy/55">
                  * Indicative. Final amount + GST will be locked at the live
                  forex rate on the date of payment.
                </p>
              )}

              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
                <p className="font-semibold uppercase tracking-wider text-xs">
                  Payment opens soon
                </p>
                <p className="mt-1.5 leading-relaxed">
                  A Proforma Invoice has been emailed to you for your records.
                  No GST has been charged on it. Once payment opens, you&rsquo;ll
                  receive an email with a payment link — your final Tax Invoice
                  with GST will be issued upon receipt of payment.
                </p>
              </div>

              <p className="text-sm text-navy/70">
                Proforma Invoice sent to{" "}
                <strong>{registration.contact_email}</strong>.
              </p>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <InvoiceActions
                  registration={registration}
                  invoice={invoice}
                  fair={fair}
                  billing={billing}
                  itinerary={itinerary}
                  showPayButton={false}
                />
              </div>

              <div className="pt-4 text-xs text-navy/50">
                Questions? Email{" "}
                <a
                  href="mailto:eduadviser@iaesgujarat.org"
                  className="text-gold-600 hover:underline"
                >
                  eduadviser@iaesgujarat.org
                </a>{" "}
                or call +91 97264 80899.
              </div>

              <Link
                href="/"
                className="inline-block text-sm text-navy hover:text-gold-600"
              >
                &larr; Back to home
              </Link>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </>
    );
  }

  // Post-payment view (existing flow)
  const amountLabel = isINR
    ? formatINR(Number(invoice.total_amount_inr || 0))
    : formatUSD(Number(invoice.total_amount_usd || 0));

  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <Card>
          <CardContent className="space-y-8 px-8 py-10 text-center sm:px-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
                Booking Confirmed
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
                You&rsquo;re in.
              </h1>
              <p className="mt-3 text-navy/70">
                {registration.university_name} is registered for{" "}
                <strong>{fair.name}</strong> &mdash; we look forward to hosting
                you on {formatDate(fair.fair_date)} in {fair.city}.
              </p>
            </div>

            <div className="grid gap-4 rounded-md border border-navy/10 bg-cream/60 p-6 text-left text-sm">
              <Row label="University" value={registration.university_name} />
              <Row label="Fair" value={fair.name} />
              <Row label="Date" value={formatDate(fair.fair_date)} />
              <Row label="Venue" value={fair.venue || fair.city} />
              <Row label="Booth Type" value={registration.booth_type} />
              <Row label="Invoice" value={invoice.invoice_number || "—"} />
              {invoice.proforma_reference && (
                <Row
                  label="Proforma Ref."
                  value={invoice.proforma_reference}
                />
              )}
              <Row label="Amount Paid" value={amountLabel} bold />
            </div>

            <p className="text-sm text-navy/70">
              A confirmation email has been sent to{" "}
              <strong>{registration.contact_email}</strong>.
            </p>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <InvoiceActions
                registration={registration}
                invoice={invoice}
                fair={fair}
                billing={billing}
                showPayButton={false}
              />
            </div>

            <div className="pt-4 text-xs text-navy/50">
              Questions? Email{" "}
              <a
                href="mailto:eduadviser@iaesgujarat.org"
                className="text-gold-600 hover:underline"
              >
                eduadviser@iaesgujarat.org
              </a>{" "}
              or call +91 97264 80899.
            </div>

            <Link
              href="/"
              className="inline-block text-sm text-navy hover:text-gold-600"
            >
              &larr; Back to home
            </Link>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-navy/10 pb-2 last:border-0 last:pb-0">
      <span className="text-xs uppercase tracking-wider text-navy/55">
        {label}
      </span>
      <span
        className={bold ? "font-semibold text-navy" : "text-navy/85"}
      >
        {value}
      </span>
    </div>
  );
}
