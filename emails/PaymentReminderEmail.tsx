import * as React from "react";
import type { Currency } from "@/types";
import { MailerLayout, CTA_BUTTON_STYLE } from "./_layout";

interface Props {
  recipientName: string;
  fairName: string;
  invoiceNumber: string;
  paymentCurrency: Currency;
  totalUSD: number | null;
  totalINR: number | null;
  dueDate: string | null;
  payUrl: string;
}

function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PaymentReminderEmail({
  recipientName,
  fairName,
  invoiceNumber,
  paymentCurrency,
  totalUSD,
  totalINR,
  dueDate,
  payUrl,
}: Props) {
  const amount =
    paymentCurrency === "INR" ? fmtINR(totalINR ?? 0) : fmtUSD(totalUSD ?? 0);

  return (
    <MailerLayout
      preheader={`Payment pending for ${invoiceNumber}.`}
      eyebrow="Payment Reminder"
      title={`Payment pending — ${fairName}`}
    >
      <p style={{ margin: 0, fontSize: 16 }}>Dear {recipientName},</p>
      <p style={{ marginTop: 14, lineHeight: 1.6 }}>
        Your registration for the {fairName} is{" "}
        <strong>pending payment</strong>. Please complete the payment to
        confirm your booth.
      </p>

      <table
        width="100%"
        style={{
          marginTop: 20,
          borderTop: "1px solid #E1E6EF",
          borderBottom: "1px solid #E1E6EF",
        }}
      >
        <tbody>
          <Row label="Invoice" value={invoiceNumber} />
          <Row label="Amount" value={amount} />
          {dueDate && <Row label="Due date" value={dueDate} />}
        </tbody>
      </table>

      <div style={{ textAlign: "center", marginTop: 28 }}>
        <a href={payUrl} style={CTA_BUTTON_STYLE}>
          Pay Now &rarr;
        </a>
      </div>

      <p
        style={{
          marginTop: 22,
          padding: 12,
          backgroundColor: "#FEF3C7",
          color: "#92400E",
          fontSize: 13,
          borderRadius: 6,
        }}
      >
        Per our T&amp;C §6.5, registrations without payment within 7 days of
        invoice issuance may be cancelled and the slot offered to another
        institution.
      </p>

      <p style={{ marginTop: 22, lineHeight: 1.6 }}>
        Questions? eduadviser@iaesgujarat.org &middot; +91 97264 80899
      </p>
      <p style={{ marginTop: 12, lineHeight: 1.6 }}>
        <strong>IAES Team</strong>
      </p>
    </MailerLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: "10px 0", color: "#6F7B8F", fontSize: 13 }}>
        {label}
      </td>
      <td
        style={{
          padding: "10px 0",
          textAlign: "right",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {value}
      </td>
    </tr>
  );
}
