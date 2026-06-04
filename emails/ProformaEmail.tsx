import * as React from "react";
import type { Currency } from "@/types";
import { MailerLayout } from "./_layout";

interface Props {
  contactName: string;
  universityName: string;
  fairName: string;
  fairDateRange: string;
  proformaReference: string;
  paymentCurrency: Currency;
  baseAmountUSD: number;
  indicativeINR: number | null;
  forexRate: number | null;
  forexDate: string | null;
  /** Line-item add-ons (extra tables + extra reps). */
  addonTables: number;
  addonReps: number;
  addonTablesCostUSD: number;
  addonRepsCostUSD: number;
  tierLabel: "Early Bird" | "Standard";
  totalUSD: number;
  /** v19 — when the registrant asked us to address the invoice to
   *  someone else (Mode A). Shown as a note; null = addressed to self. */
  addressedTo?: string | null;
}

function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ProformaEmail({
  contactName,
  universityName,
  fairName,
  fairDateRange,
  proformaReference,
  paymentCurrency,
  baseAmountUSD,
  indicativeINR,
  forexRate,
  forexDate,
  addonTables,
  addonReps,
  addonTablesCostUSD,
  addonRepsCostUSD,
  tierLabel,
  totalUSD,
  addressedTo,
}: Props) {
  return (
    <MailerLayout
      preheader={`You're registered for ${fairName}. Payment opens soon.`}
      eyebrow={`Proforma · ${proformaReference}`}
      title={`You're registered — ${fairName}`}
    >
      <p style={{ margin: 0, fontSize: 16 }}>Dear {contactName},</p>
      <p style={{ marginTop: 14, lineHeight: 1.6 }}>
        Thank you for registering <strong>{universityName}</strong> for the{" "}
        {fairName}. Your registration is confirmed. Payment will open shortly.
      </p>
      {addressedTo && (
        <p style={{ marginTop: 10, fontSize: 13, color: "#6F7B8F" }}>
          As requested, the attached Proforma is addressed to{" "}
          <strong>{addressedTo}</strong>.
        </p>
      )}

      <div
        style={{
          marginTop: 20,
          border: "1px dashed #C9A227",
          borderRadius: 6,
          padding: 16,
          backgroundColor: "#FFF8E1",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "#92400E",
            fontWeight: 700,
          }}
        >
          Proforma Invoice
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 10, color: "#92400E" }}>
          This is NOT a tax invoice. No GST has been charged.
        </p>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 14,
            fontWeight: 700,
            color: "#0B2B5C",
          }}
        >
          Reference: {proformaReference}
        </p>
      </div>

      {/* Line items */}
      <table
        width="100%"
        style={{
          marginTop: 20,
          borderTop: "1px solid #E1E6EF",
          borderBottom: "1px solid #E1E6EF",
        }}
      >
        <tbody>
          <Row
            label={`Fair Registration — ${tierLabel}`}
            sub="1 Counter · 2 Representatives included"
            value={fmtUSD(baseAmountUSD - addonTablesCostUSD - addonRepsCostUSD)}
          />
          {addonTables > 0 && (
            <Row
              label={`Additional Table × ${addonTables}`}
              value={fmtUSD(addonTablesCostUSD)}
            />
          )}
          {addonReps > 0 && (
            <Row
              label={`Additional Representative × ${addonReps}`}
              value={fmtUSD(addonRepsCostUSD)}
            />
          )}
          <tr>
            <td
              style={{
                padding: "12px 0",
                color: "#0B2B5C",
                fontSize: 14,
                fontWeight: 700,
                borderTop: "1px solid #E1E6EF",
              }}
            >
              Total Payable
            </td>
            <td
              style={{
                padding: "12px 0",
                textAlign: "right",
                color: "#0B2B5C",
                fontSize: 16,
                fontWeight: 700,
                borderTop: "1px solid #E1E6EF",
              }}
            >
              {fmtUSD(totalUSD)}
            </td>
          </tr>
        </tbody>
      </table>

      {paymentCurrency === "INR" && indicativeINR != null && (
        <p
          style={{
            marginTop: 14,
            fontSize: 12,
            lineHeight: 1.6,
            color: "#6F7B8F",
          }}
        >
          <strong>Indicative INR amount: {fmtINR(indicativeINR)}</strong>
          {forexRate && forexDate && (
            <>
              {" "}
              (at 1 USD = ₹{forexRate.toFixed(2)} on {forexDate})
            </>
          )}
          .<br />* Indicative only. Final INR amount + GST (18%) are calculated
          at the live forex rate on the date of payment.
        </p>
      )}

      <p
        style={{
          marginTop: 22,
          padding: 12,
          backgroundColor: "#F5F7FA",
          borderLeft: "4px solid #0B2B5C",
          fontSize: 13,
          color: "#3A5A94",
          lineHeight: 1.6,
        }}
      >
        <strong>Important notes</strong>
        <br />• This is a Proforma Invoice only. It is NOT a tax invoice.
        <br />• No GST has been charged on this document.
        <br />• A final tax invoice with official number + applicable GST will
        be issued upon receipt of payment.
        <br />• You will receive an email when the payment gateway opens. Your
        spot is reserved.
      </p>

      <p style={{ marginTop: 22, lineHeight: 1.6 }}>
        Fair dates: <strong>{fairDateRange}</strong>
      </p>

      <p style={{ marginTop: 20, lineHeight: 1.6 }}>
        For queries: eduadviser@iaesgujarat.org · +91 97264 80899
      </p>

      <p style={{ marginTop: 20, lineHeight: 1.6 }}>
        <strong>IAES Team</strong>
      </p>
    </MailerLayout>
  );
}

function Row({
  label,
  sub,
  value,
}: {
  label: string;
  sub?: string;
  value: string;
}) {
  return (
    <tr>
      <td style={{ padding: "10px 0" }}>
        <div style={{ fontSize: 14, color: "#0B2B5C" }}>{label}</div>
        {sub && (
          <div style={{ marginTop: 2, fontSize: 12, color: "#6F7B8F" }}>
            {sub}
          </div>
        )}
      </td>
      <td
        style={{
          padding: "10px 0",
          textAlign: "right",
          fontWeight: 600,
          fontSize: 14,
          color: "#0B2B5C",
          verticalAlign: "top",
        }}
      >
        {value}
      </td>
    </tr>
  );
}
