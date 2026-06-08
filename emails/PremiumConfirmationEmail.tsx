import * as React from "react";
import { BankDetailsEmail } from "./BankDetailsEmail";

interface Props {
  contactName: string;
  universityName: string;
  fairName: string;
  fairDateRange: string;
  proformaReference: string;
  amountUSD: number;
  premiumDeadline: string | null;
}

const DELIVERABLES = [
  "2 counter spaces / tables",
  "4 university representatives",
  "Branded backdrop displayed at your booth",
  "Large logo in IAES print advertisements",
  "Dedicated social media campaign for your university",
  "Vernacular language volunteer at your desk",
  "Transport and meals for all tour days",
];

function fmtDate(d: string | null): string {
  if (!d) return "the premium deadline";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PremiumConfirmationEmail({
  contactName,
  universityName,
  fairName,
  fairDateRange,
  proformaReference,
  amountUSD,
  premiumDeadline,
}: Props) {
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
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#0B2B5C",
                }}
              >
                &#9830;
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 14 }}>
                Premium Booth Reserved
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
                Congratulations! The Premium Booth for{" "}
                <strong>{universityName}</strong> at the {fairName} (
                {fairDateRange}) is reserved.
              </p>

              <div
                style={{
                  marginTop: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: "#6F7B8F",
                }}
              >
                Your Premium Booth Package
              </div>
              <table
                width="100%"
                style={{ marginTop: 8, borderCollapse: "collapse" }}
              >
                <tbody>
                  {DELIVERABLES.map((d) => (
                    <tr key={d}>
                      <td
                        style={{
                          padding: "8px 0",
                          borderBottom: "1px solid #E1E6EF",
                          fontSize: 13,
                          color: "#374151",
                        }}
                      >
                        <span style={{ color: "#C9A227" }}>&#10003;</span> {d}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div
                style={{
                  marginTop: 20,
                  padding: "14px 18px",
                  backgroundColor: "#F5F7FA",
                  borderRadius: 8,
                }}
              >
                <p style={{ margin: 0, fontSize: 13, color: "#6F7B8F" }}>
                  Proforma Invoice
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {proformaReference} &middot; USD{" "}
                  {amountUSD.toLocaleString()}
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 12,
                    color: "#6F7B8F",
                  }}
                >
                  The payment gateway opens shortly — you will be notified.
                </p>
              </div>

              <BankDetailsEmail />

              <div
                style={{
                  marginTop: 20,
                  padding: "14px 18px",
                  border: "1px solid #E8D9A8",
                  backgroundColor: "#FBF6E7",
                  borderRadius: 8,
                }}
              >
                <p
                  style={{ margin: 0, fontSize: 14, fontWeight: 600 }}
                >
                  ⚠️ Action required — logo submission
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "#374151",
                  }}
                >
                  To activate your branded backdrop and print-ad placement,
                  email your logo to{" "}
                  <a
                    href="mailto:educationfair@iaesgujarat.org"
                    style={{ color: "#0B2B5C" }}
                  >
                    educationfair@iaesgujarat.org
                  </a>{" "}
                  — subject{" "}
                  <em>
                    Logo — {universityName} — {proformaReference}
                  </em>
                  . PNG, minimum 300 dpi, transparent background preferred,
                  by <strong>{fmtDate(premiumDeadline)}</strong>. A late or
                  missing logo means the print ad may not be possible.
                </p>
              </div>

              <p style={{ marginTop: 24, lineHeight: 1.6 }}>
                Questions?{" "}
                <a
                  href="mailto:educationfair@iaesgujarat.org"
                  style={{ color: "#0B2B5C" }}
                >
                  educationfair@iaesgujarat.org
                </a>{" "}
                &middot; +91 9726480899
              </p>
              <p style={{ marginTop: 20, lineHeight: 1.6 }}>
                See you in Ahmedabad!
                <br />
                <strong>IAES Team</strong>
                <br />
                Indo American Education Society, Ahmedabad
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
              fairs.iaesgujarat.org
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
