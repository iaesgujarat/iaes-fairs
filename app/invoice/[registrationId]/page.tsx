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
       invoice:invoices(*),
       billing:billing_details(*)`
    )
    .eq("id", params.registrationId)
    .maybeSingle();

  if (!data) notFound();

  const invoice = (Array.isArray(data.invoice)
    ? data.invoice[0]
    : data.invoice) as Invoice | null;
  const fair = data.fair as Fair | null;
  const billing = (Array.isArray(data.billing)
    ? data.billing[0]
    : data.billing) as BillingDetails | null;

  if (!invoice || !fair) notFound();

  const registration = data as Registration;
  const isINR = invoice.payment_currency === "INR";

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
            {isINR ? (
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
          </CardContent>

          <CardFooter>
            <InvoiceActions
              registration={registration}
              invoice={invoice}
              fair={fair}
              billing={billing}
            />
          </CardFooter>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
