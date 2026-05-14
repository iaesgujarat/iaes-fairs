import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { InvoiceActions } from "@/components/InvoiceActions";
import { formatINR, formatDateShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
}: {
  params: { registrationId: string };
}) {
  const supabase = createAdminClient();

  const { data: registration } = await supabase
    .from("registrations")
    .select(
      `*,
       fair:fairs(*),
       invoice:invoices(*)`
    )
    .eq("id", params.registrationId)
    .maybeSingle();

  if (!registration) {
    notFound();
  }

  const invoice = Array.isArray(registration.invoice)
    ? registration.invoice[0]
    : registration.invoice;
  const fair = registration.fair;

  if (!invoice || !fair) {
    notFound();
  }

  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-navy/60 hover:text-navy"
          >
            &larr; Back to home
          </Link>
          <StatusBadge status={registration.status} />
        </div>

        <Card>
          <CardContent className="space-y-8 px-8 py-8 sm:px-10 sm:py-10">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-6 border-b border-navy/10 pb-6">
              <div>
                <p className="font-serif text-2xl font-semibold text-navy">
                  IAES
                </p>
                <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-gold-500">
                  EducationUSA Fairs &middot; Gujarat
                </p>
              </div>
              <p className="font-serif text-2xl tracking-[0.18em] text-navy/70">
                INVOICE
              </p>
            </div>

            {/* Parties */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/50">
                  From
                </p>
                <p className="mt-2 font-medium text-navy">
                  Indo American Education Society
                </p>
                <p className="text-sm text-navy/70">Ahmedabad, Gujarat</p>
                <p className="text-sm text-navy/70">
                  eduadviser@iaesgujarat.org
                </p>
                <p className="text-sm text-navy/70">+91 98255 93262</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/50">
                  Billed To
                </p>
                <p className="mt-2 font-medium text-navy">
                  {registration.university_name}
                </p>
                <p className="text-sm text-navy/70">
                  {registration.contact_name}
                </p>
                <p className="text-sm text-navy/70">
                  {registration.contact_email}
                </p>
              </div>
            </div>

            {/* Meta */}
            <div className="grid gap-6 rounded-md bg-cream/70 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/50">
                  Invoice No.
                </p>
                <p className="mt-1 font-semibold text-navy">
                  {invoice.invoice_number}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-navy/50">
                  Issued
                </p>
                <p className="mt-1 font-semibold text-navy">
                  {formatDateShort(invoice.issued_at)}
                </p>
              </div>
              {invoice.due_date && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-navy/50">
                    Due
                  </p>
                  <p className="mt-1 font-semibold text-navy">
                    {formatDateShort(invoice.due_date)}
                  </p>
                </div>
              )}
            </div>

            {/* Line items */}
            <div className="overflow-hidden rounded-md border border-navy/10">
              <table className="w-full text-sm">
                <thead className="bg-navy text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-navy/10">
                    <td className="px-4 py-3">
                      Fair Booth &mdash; {registration.booth_type}
                      <span className="ml-2 text-xs text-navy/50">
                        ({fair.name})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatINR(invoice.amount_inr)}
                    </td>
                  </tr>
                  <tr className="border-b border-navy/10 text-navy/70">
                    <td className="px-4 py-3">GST @ {invoice.gst_percent}%</td>
                    <td className="px-4 py-3 text-right">
                      {formatINR(invoice.gst_amount_inr)}
                    </td>
                  </tr>
                  <tr className="bg-cream/70 font-semibold text-navy">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right text-base">
                      {formatINR(invoice.total_amount_inr)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-navy/50">
              Payments accepted via Razorpay (card / UPI / netbanking). For
              international wire transfer, contact eduadviser@iaesgujarat.org.
            </p>
          </CardContent>

          <CardFooter>
            <InvoiceActions
              invoiceNumber={invoice.invoice_number}
              issuedDate={invoice.issued_at}
              dueDate={invoice.due_date}
              universityName={registration.university_name}
              contactName={registration.contact_name}
              contactEmail={registration.contact_email}
              boothType={registration.booth_type}
              amountInr={Number(invoice.amount_inr)}
              gstAmountInr={Number(invoice.gst_amount_inr)}
              totalAmountInr={Number(invoice.total_amount_inr)}
              registrationId={registration.id}
              status={registration.status}
            />
          </CardFooter>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
