import { notFound } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/Card";
import { InvoiceActions } from "@/components/InvoiceActions";
import { formatINR, formatDate } from "@/lib/utils";
import type { Fair } from "@/types";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  params,
}: {
  params: { registrationId: string };
}) {
  const supabase = createAdminClient();

  const { data: reg } = await supabase
    .from("registrations")
    .select(`*, fair:fairs(*), invoice:invoices(*)`)
    .eq("id", params.registrationId)
    .maybeSingle();

  if (!reg) notFound();

  const invoice = Array.isArray(reg.invoice) ? reg.invoice[0] : reg.invoice;
  const fair = reg.fair as Fair;
  if (!invoice || !fair) notFound();

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
                {reg.university_name} is registered for{" "}
                <strong>{fair.name}</strong> &mdash; we look forward to hosting
                you on {formatDate(fair.fair_date)} in {fair.city}.
              </p>
            </div>

            <div className="grid gap-4 rounded-md border border-navy/10 bg-cream/60 p-6 text-left text-sm">
              <Row label="University" value={reg.university_name} />
              <Row label="Fair" value={fair.name} />
              <Row label="Date" value={formatDate(fair.fair_date)} />
              <Row label="Venue" value={fair.venue || fair.city} />
              <Row label="Booth Type" value={reg.booth_type} />
              <Row label="Invoice" value={invoice.invoice_number} />
              <Row
                label="Amount Paid"
                value={formatINR(Number(invoice.total_amount_inr))}
                bold
              />
            </div>

            <p className="text-sm text-navy/70">
              A confirmation email has been sent to{" "}
              <strong>{reg.contact_email}</strong>.
            </p>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <InvoiceActions
                invoiceNumber={invoice.invoice_number}
                issuedDate={invoice.issued_at}
                dueDate={invoice.due_date}
                universityName={reg.university_name}
                contactName={reg.contact_name}
                contactEmail={reg.contact_email}
                boothType={reg.booth_type}
                amountInr={Number(invoice.amount_inr)}
                gstAmountInr={Number(invoice.gst_amount_inr)}
                totalAmountInr={Number(invoice.total_amount_inr)}
                registrationId={reg.id}
                status="confirmed"
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
              or call +91 98255 93262.
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
        className={
          bold ? "font-semibold text-navy" : "text-navy/85"
        }
      >
        {value}
      </span>
    </div>
  );
}
