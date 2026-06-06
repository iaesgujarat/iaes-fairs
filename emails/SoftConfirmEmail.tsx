import * as React from "react";

interface Props {
  contactName: string;
  universityName: string;
  fairName: string;
  fairDate: string;
}

/**
 * Soft-confirm ("spot reserved, payment pending") note. Sent when an
 * admin acknowledges a registration as a HOLD before payment. Kept
 * deliberately short — the proforma (with the amount + bank details)
 * is the financial document; this is just the friendly reservation.
 */
export function SoftConfirmEmail({
  contactName,
  universityName,
  fairName,
  fairDate,
}: Props) {
  const prettyDate = fairDate
    ? new Date(fairDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

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
              <div style={{ fontSize: 22, fontWeight: 600 }}>
                Spot Reserved
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
                Good news — we&rsquo;ve reserved a spot for{" "}
                <strong>{universityName}</strong> at the {fairName}
                {prettyDate ? ` (${prettyDate})` : ""}. Your participation is{" "}
                <strong>soft-confirmed</strong>.
              </p>
              <div
                style={{
                  marginTop: 20,
                  padding: "14px 16px",
                  backgroundColor: "#FBF6E6",
                  border: "1px solid #ECD9A0",
                  borderRadius: 8,
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                <strong>Payment is still pending.</strong> Please complete
                payment as per your proforma to lock in your booking. Once we
                receive it, we&rsquo;ll send your <strong>final confirmation</strong>,
                tax invoice, and the full event itinerary.
              </div>
              <p style={{ marginTop: 24, lineHeight: 1.6 }}>
                Warm regards,
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
