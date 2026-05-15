"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InvoicePDF } from "@/components/InvoicePDF";
import type { Registration, Invoice, Fair, BillingDetails } from "@/types";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  {
    ssr: false,
    loading: () => (
      <Button variant="secondary" disabled>
        Preparing PDF...
      </Button>
    ),
  }
);

interface Props {
  registration: Registration;
  invoice: Invoice;
  fair: Fair;
  billing: BillingDetails | null;
  showPayButton?: boolean;
}

export function InvoiceActions({
  registration,
  invoice,
  fair,
  billing,
  showPayButton = true,
}: Props) {
  const isPaid =
    registration.status === "paid" || registration.status === "confirmed";

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <PDFDownloadLink
        document={
          <InvoicePDF
            registration={registration}
            invoice={invoice}
            fair={fair}
            billing={billing}
          />
        }
        fileName={`${invoice.invoice_number}.pdf`}
      >
        {({ loading }) => (
          <Button variant="secondary" disabled={loading}>
            <Download className="h-4 w-4" />
            {loading ? "Generating..." : "Download PDF"}
          </Button>
        )}
      </PDFDownloadLink>

      {showPayButton && !isPaid && (
        <Link href={`/payment/${registration.id}`}>
          <Button variant="gold" size="lg">
            Pay Now &rarr;
          </Button>
        </Link>
      )}
    </div>
  );
}
