import * as React from "react";

interface Props {
  contactName: string;
  fairName: string;
  fairWhen: string; // pre-formatted "12–13 Dec 2026 · Ahmedabad"
  registerUrl: string;
}

/**
 * Sent to subscribe-form leads (announcement_leads) when a new fair
 * opens. Promotional — has a clear register CTA and an opt-out line.
 */
export function SubscriberAnnouncementEmail({
  contactName,
  fairName,
  fairWhen,
  registerUrl,
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
                Registrations are open!
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
                Great news — registrations for the{" "}
                <strong>{fairName}</strong> are now open. As someone who asked
                to hear about our fairs, you&rsquo;re among the first to know.
              </p>
              <p style={{ marginTop: 8, lineHeight: 1.6, color: "#3A4763" }}>
                📅 {fairWhen}
              </p>

              <a
                href={registerUrl}
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
                  marginTop: 20,
                }}
              >
                View details &amp; register
              </a>

              <p style={{ marginTop: 24, lineHeight: 1.6 }}>
                We look forward to seeing you there.
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
              You&rsquo;re receiving this because you subscribed to IAES fair
              updates. Reply &ldquo;unsubscribe&rdquo; to opt out.
              <br />
              fairs.iaesgujarat.org &middot; +91 97264 80899
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
