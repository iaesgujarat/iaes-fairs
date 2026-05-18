import * as React from "react";

interface Props {
  fullName: string;
  institutionName: string;
  passNumber: string;
  passUrl: string;
  qrDataUrl: string; // base64 PNG produced by `qrcode` package
  fairName: string;
  fairDateRange: string;
  venue: string;
}

export function StudentPassEmail({
  fullName,
  institutionName,
  passNumber,
  passUrl,
  qrDataUrl,
  fairName,
  fairDateRange,
  venue,
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
        style={{ maxWidth: 480, margin: "0 auto" }}
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
                  fontSize: 12,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#C9A227",
                }}
              >
                Your Fair Pass
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>
                {fairName}
              </div>
              <div style={{ fontSize: 13, color: "#fff", opacity: 0.8, marginTop: 4 }}>
                {fairDateRange} &middot; {venue}
              </div>
            </td>
          </tr>
          <tr>
            <td
              style={{
                backgroundColor: "#fff",
                padding: "28px 24px",
                borderRadius: "0 0 8px 8px",
                textAlign: "center",
              }}
            >
              <p style={{ margin: 0, fontSize: 16, textAlign: "left" }}>
                Dear {fullName},
              </p>
              <p style={{ marginTop: 12, lineHeight: 1.6, textAlign: "left" }}>
                Your pass for the {fairName} is ready. Show this QR code at
                each university booth — reps will scan it to instantly see
                your profile.
              </p>

              <img
                src={qrDataUrl}
                alt={`QR code for pass ${passNumber}`}
                width={200}
                height={200}
                style={{
                  display: "block",
                  margin: "24px auto",
                  border: "8px solid #fff",
                  outline: "1px solid #E1E6EF",
                }}
              />

              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                {passNumber}
              </p>
              <p style={{ marginTop: 4, fontSize: 13, color: "#6F7B8F" }}>
                {institutionName}
              </p>

              <div style={{ marginTop: 24, textAlign: "left" }}>
                <p style={{ fontSize: 13, color: "#6F7B8F", marginBottom: 8 }}>
                  HOW TO USE
                </p>
                <ol
                  style={{
                    paddingLeft: 18,
                    fontSize: 13,
                    color: "#3A5A94",
                    lineHeight: 1.6,
                  }}
                >
                  <li>Save this email or screenshot the QR code.</li>
                  <li>Show it to university reps at each booth.</li>
                  <li>They scan it to see your profile instantly.</li>
                </ol>
                <p style={{ fontSize: 12, color: "#9AA4B8", marginTop: 8 }}>
                  No app needed. Works on any phone.
                </p>
              </div>

              <div style={{ textAlign: "center", marginTop: 24 }}>
                <a
                  href={passUrl}
                  style={{
                    display: "inline-block",
                    backgroundColor: "#C9A227",
                    color: "#0B2B5C",
                    fontWeight: 600,
                    padding: "12px 24px",
                    borderRadius: 6,
                    textDecoration: "none",
                    fontSize: 14,
                  }}
                >
                  Open My Pass &rarr;
                </a>
              </div>

              <p style={{ marginTop: 28, fontSize: 12, color: "#9AA4B8" }}>
                Questions? eduadviser@iaesgujarat.org &middot; +91 97264 80899
              </p>
              <p style={{ marginTop: 16, fontSize: 12, color: "#0B2B5C" }}>
                See you at the fair!
                <br />
                <strong>IAES Team</strong>
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
