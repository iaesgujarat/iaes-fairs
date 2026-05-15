import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/Card";
import { PaymentButton } from "@/components/PaymentButton";
import { formatINR, formatUSD } from "@/lib/utils";
import type { Fair, Invoice } from "@/types";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
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

  if (reg.status === "confirmed" || reg.status === "paid") {
    redirect(`/confirmation/${params.registrationId}`);
  }

  const invoice = (Array.isArray(reg.invoice)
    ? reg.invoice[0]
    : reg.invoice) as Invoice | null;
  const fair = reg.fair as Fair;

  if (!invoice || !fair) notFound();

  const isINR = invoice.payment_currency === "INR";
  const payableMajor = isINR
    ? Number(invoice.total_amount_inr || 0)
    : Number(invoice.total_amount_usd || 0);
  const totalLabel = isINR ? formatINR(payableMajor) : formatUSD(payableMajor);

  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <div className="mb-6">
          <Link
            href={`/invoice/${params.registrationId}`}
            className="text-sm text-navy/60 hover:text-navy"
          >
            &larr; Back to invoice
          </Link>
        </div>

        <Card>
          <CardContent className="space-y-6 px-8 py-8 sm:px-10 sm:py-10">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
                Secure Payment
              </p>
              <h1 className="mt-2 font-serif text-2xl font-semibold text-navy sm:text-3xl">
                Complete your booth registration
              </h1>
              <p className="mt-2 text-navy/70">
                You&rsquo;re paying for <strong>{reg.university_name}</strong>{" "}
                at the {fair.name}.
              </p>
            </div>

            <div className="rounded-md bg-cream p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-navy/50">
                    Total
                  </p>
                  <p className="font-serif text-3xl font-semibold text-navy">
                    {totalLabel}
                  </p>
                  <p className="text-xs text-navy/60">
                    Invoice {invoice.invoice_number}
                    {isINR ? " · incl. GST" : " · zero-rated export"}
                  </p>
                </div>
                <div className="text-right text-xs text-navy/60">
                  <p>{reg.contact_name}</p>
                  <p>{reg.contact_email}</p>
                </div>
              </div>
            </div>

            <PaymentButton
              registrationId={params.registrationId}
              totalLabel={totalLabel}
              fairName={fair.name}
            />
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
