import * as React from "react";
import type { Currency } from "@/types";

interface Props {
  contactName: string;
  universityName: string;
  fairName: string;
  fairDate: string;
  venue: string;
  boothType: string;
  invoiceNumber: string;
  paymentCurrency: Currency;
  amountPaidUSD: number | null;
  amountPaidINR: number | null;
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ConfirmationEmail({
  contactName,
  universityName,
  fairName,
  fairDate,
  venue,
  boothType,
  invoiceNumber,
  paymentCurrency,
  amountPaidUSD,
  amountPaidINR,
}: Props) {
  const prettyDate = new Date(fairDate).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const amountLabel =
    paymentCurrency === "INR"
      ? formatINR(amountPaidINR ?? 0)
      : formatUSD(amountPaidUSD ?? 0);

  return (
    <div
      style={{
        fontFamily: "Helvetica, Arial, sans-serif",
        color: "#0B2B5C",
        backgroundColor: "#F5F7FA",
        padding: "40px 20px",
      }}
    >
      <table
        align="center"
        width="100%"
        style={{ maxWidth: 560, margin: "0 auto" }}
      >
        <tbody>
          <tr>
            <td
              style={{
                backgroundColor: "#0B2B5C",
                color: "#fff",
                padding: "28px 24px",
                borderRadius: "8px 8px 0 0",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "#C9A227",
                  display: "inline-block",
                  lineHeight: "56px",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#0B2B5C",
                }}
              >
                &#10003;
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 14 }}>
                Booking Confirmed
              </div>
              <div style={{ fontSize: 13, color: "#C9A227", marginTop: 4 }}>
                {fairName}
              </div>
            </td>
          </tr>
          <tr>
            <td
              style={{
                backgroundColor: "#fff",
                padding: "28px 24px",
                borderRadius: "0 0 8px 8px",
              }}
            >
              <p style={{ margin: 0, fontSize: 16 }}>Dear {contactName},</p>
              <p style={{ marginTop: 16, lineHeight: 1.6 }}>
                Your booth at the {fairName} is confirmed. We&rsquo;re delighted
                to host <strong>{universityName}</strong> in Ahmedabad.
              </p>

              <table
                width="100%"
                style={{
                  marginTop: 24,
                  borderCollapse: "collapse",
                }}
              >
                <tbody>
                  {[
                    ["University", universityName],
                    ["Fair", fairName],
                    ["Date", prettyDate],
                    ["Venue", venue],
                    ["Booth Type", boothType],
                    ["Invoice", invoiceNumber],
                    ["Amount Paid", amountLabel],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td
                        style={{
                          padding: "10px 0",
                          color: "#6F7B8F",
                          borderBottom: "1px solid #E1E6EF",
                          fontSize: 13,
                        }}
                      >
                        {label}
                      </td>
                      <td
                        style={{
                          padding: "10px 0",
                          textAlign: "right",
                          fontWeight: 600,
                          borderBottom: "1px solid #E1E6EF",
                          fontSize: 14,
                        }}
                      >
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p style={{ marginTop: 24, lineHeight: 1.6 }}>
                We&rsquo;ll send the event briefing pack &mdash; venue map,
                schedule, student profile data &mdash; approximately 4 weeks
                before the fair.
              </p>

              <p style={{ marginTop: 24, lineHeight: 1.6 }}>
                See you in Ahmedabad!
                <br />
                <strong>IAES Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td
              style={{
                fontSize: 11,
                color: "#9AA4B8",
                textAlign: "center",
                padding: "16px 24px",
              }}
            >
              fairs.iaesgujarat.org &middot; +91 97264 80899
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
