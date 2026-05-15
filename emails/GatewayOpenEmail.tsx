import * as React from "react";
import { MailerLayout, CTA_BUTTON_STYLE } from "./_layout";

interface Props {
  contactName: string;
  universityName: string;
  fairName: string;
  proformaReference: string;
  baseAmountUSD: number;
  totalUSD: number;
  totalTables: number;
  totalReps: number;
  payUrl: string;
  registrationDeadline: string | null;
}

function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function GatewayOpenEmail({
  contactName,
  universityName,
  fairName,
  proformaReference,
  baseAmountUSD,
  totalUSD,
  totalTables,
  totalReps,
  payUrl,
  registrationDeadline,
}: Props) {
  return (
    <MailerLayout
      preheader={`Payment is now open for your ${fairName} registration.`}
      eyebrow="Payment now open"
      title={`Complete your ${fairName} booking`}
    >
      <p style={{ margin: 0, fontSize: 16 }}>Dear {contactName},</p>
      <p style={{ marginTop: 14, lineHeight: 1.6 }}>
        Good news — the payment gateway for the {fairName} is now open. Your
        registration for <strong>{universityName}</strong> is ready. Please
        complete your payment to confirm your booth.
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
          <Row label="University" value={universityName} />
          <Row label="Booth" value={`${totalTables} table${totalTables === 1 ? "" : "s"} · ${totalReps} rep${totalReps === 1 ? "" : "s"}`} />
          <Row label="Amount due" value={fmtUSD(totalUSD)} />
          <Row label="Proforma reference" value={proformaReference} />
        </tbody>
      </table>

      <div style={{ textAlign: "center", marginTop: 28 }}>
        <a href={payUrl} style={CTA_BUTTON_STYLE}>
          Complete Payment Now &rarr;
        </a>
      </div>

      {registrationDeadline && (
        <p
          style={{
            marginTop: 18,
            fontSize: 13,
            color: "#6F7B8F",
            textAlign: "center",
          }}
        >
          Payment deadline: <strong>{registrationDeadline}</strong>. Early-bird
          rate applies if you are within the early-bird window.
        </p>
      )}

      <p
        style={{
          marginTop: 22,
          padding: 12,
          backgroundColor: "#F5F7FA",
          borderLeft: "4px solid #C9A227",
          fontSize: 13,
          color: "#3A5A94",
          lineHeight: 1.6,
        }}
      >
        Once payment is received, your official Tax Invoice will be issued and
        your booking will be confirmed. The base fee is{" "}
        {fmtUSD(baseAmountUSD)}; GST applies on the final tax invoice for INR
        payments.
      </p>

      <p style={{ marginTop: 20, lineHeight: 1.6 }}>
        Questions? eduadviser@iaesgujarat.org · +91 98255 93262
      </p>
      <p style={{ marginTop: 16, lineHeight: 1.6 }}>
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
