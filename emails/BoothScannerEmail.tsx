import * as React from "react";

interface Props {
  contactName: string;
  universityName: string;
  fairName: string;
  fairDate: string;
  scanUrl: string;
  portalUrl: string;
  guideUrl: string;
  invoiceNumber: string;
}

/**
 * Pre-fair "your booth scanner is ready" email. Carries the university's
 * INDIVIDUAL pre-bound scan link (one tap → scan), a manual fallback
 * (their invoice number), the leads-portal link for afterward, and the
 * guide. Sent ~1 week before the fair.
 */
export function BoothScannerEmail({
  contactName,
  universityName,
  fairName,
  fairDate,
  scanUrl,
  portalUrl,
  guideUrl,
  invoiceNumber,
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
      <table align="center" width="100%" style={{ maxWidth: 560, margin: "0 auto" }}>
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
                Your booth scanner is ready
              </div>
              <div style={{ fontSize: 13, color: "#C9A227", marginTop: 4 }}>
                {fairName}
                {prettyDate ? ` · ${prettyDate}` : ""}
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
                At the fair, every student carries a QR pass. Scan it at your
                booth and the student&rsquo;s details are captured to{" "}
                <strong>{universityName}</strong>&rsquo;s lead list
                automatically — no spreadsheets, no typing.
              </p>

              <p
                style={{
                  marginTop: 24,
                  marginBottom: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#6F7B8F",
                }}
              >
                On the day — just tap this
              </p>
              <a
                href={scanUrl}
                style={{
                  display: "block",
                  textAlign: "center",
                  backgroundColor: "#C9A227",
                  color: "#0B2B5C",
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: "none",
                  padding: "14px 20px",
                  borderRadius: 8,
                }}
              >
                Open my booth scanner
              </a>
              <p style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, color: "#6F7B8F" }}>
                It opens already logged in to your booth. Tap{" "}
                <strong>Allow</strong> for the camera, point at each
                student&rsquo;s QR, add a note if you like, and tap{" "}
                <strong>Save Contact</strong>. Several reps? Each opens the same
                link on their own phone.
              </p>

              <div
                style={{
                  marginTop: 18,
                  padding: "12px 14px",
                  backgroundColor: "#F5F7FA",
                  borderRadius: 8,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "#3A4763",
                }}
              >
                <strong>Backup (if the button ever fails):</strong> open{" "}
                <span style={{ fontFamily: "monospace" }}>
                  fairs.iaesgujarat.org/scan
                </span>{" "}
                and enter your invoice number{" "}
                <strong>{invoiceNumber}</strong>.
              </div>

              <p
                style={{
                  marginTop: 24,
                  marginBottom: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#6F7B8F",
                }}
              >
                Your leads — during &amp; after
              </p>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                See and download everyone you scanned here (enter the last 4
                digits of your registered phone):
                <br />
                <a href={portalUrl} style={{ color: "#0B2B5C", fontWeight: 600 }}>
                  {portalUrl}
                </a>
              </p>

              <p style={{ marginTop: 24, lineHeight: 1.6, fontSize: 13 }}>
                Full step-by-step guide:{" "}
                <a href={guideUrl} style={{ color: "#0B2B5C", fontWeight: 600 }}>
                  {guideUrl}
                </a>
              </p>

              <p style={{ marginTop: 12, fontSize: 12, color: "#6F7B8F", lineHeight: 1.6 }}>
                You&rsquo;ll receive only the details each student consents to
                share.
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
