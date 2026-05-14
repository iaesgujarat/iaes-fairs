"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InvoicePDF } from "@/components/InvoicePDF";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false, loading: () => <Button variant="secondary" disabled>Preparing PDF...</Button> }
);

interface Props {
  invoiceNumber: string;
  issuedDate: string;
  dueDate?: string | null;
  universityName: string;
  contactName: string;
  contactEmail: string;
  boothType: string;
  amountInr: number;
  gstAmountInr: number;
  totalAmountInr: number;
  registrationId: string;
  status: string;
}

export function InvoiceActions(props: Props) {
  const isPaid = props.status === "paid" || props.status === "confirmed";

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <PDFDownloadLink
        document={
          <InvoicePDF
            invoiceNumber={props.invoiceNumber}
            issuedDate={props.issuedDate}
            dueDate={props.dueDate}
            universityName={props.universityName}
            contactName={props.contactName}
            contactEmail={props.contactEmail}
            boothType={props.boothType}
            amountInr={props.amountInr}
            gstAmountInr={props.gstAmountInr}
            totalAmountInr={props.totalAmountInr}
          />
        }
        fileName={`${props.invoiceNumber}.pdf`}
      >
        {({ loading }) => (
          <Button variant="secondary" disabled={loading}>
            <Download className="h-4 w-4" />
            {loading ? "Generating..." : "Download PDF"}
          </Button>
        )}
      </PDFDownloadLink>

      {!isPaid && (
        <Link href={`/payment/${props.registrationId}`}>
          <Button variant="gold" size="lg">
            Pay Now &rarr;
          </Button>
        </Link>
      )}
    </div>
  );
}
