"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InvoicePDF } from "@/components/InvoicePDF";
import { ProformaInvoicePDF } from "@/components/InvoiceView/ProformaInvoicePDF";
import type {
  Registration,
  Invoice,
  Fair,
  BillingDetails,
  FairItineraryStop,
} from "@/types";

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
  itinerary?: FairItineraryStop[];
  showPayButton?: boolean;
}

export function InvoiceActions({
  registration,
  invoice,
  fair,
  billing,
  itinerary = [],
  showPayButton = true,
}: Props) {
  const isPaid =
    registration.status === "paid" || registration.status === "confirmed";
  const isProforma = invoice.invoice_type === "PROFORMA";

  const fileName = isProforma
    ? `${invoice.proforma_reference || "proforma"}.pdf`
    : `${invoice.invoice_number || "invoice"}.pdf`;

  const downloadLabel = isProforma ? "Download Proforma" : "Download PDF";

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <PDFDownloadLink
        document={
          isProforma ? (
            <ProformaInvoicePDF
              registration={registration}
              invoice={invoice}
              fair={fair}
              billing={billing}
              itinerary={itinerary}
            />
          ) : (
            <InvoicePDF
              registration={registration}
              invoice={invoice}
              fair={fair}
              billing={billing}
              itinerary={itinerary}
            />
          )
        }
        fileName={fileName}
      >
        {({ loading }) => (
          <Button variant="secondary" disabled={loading}>
            <Download className="h-4 w-4" />
            {loading ? "Generating..." : downloadLabel}
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
