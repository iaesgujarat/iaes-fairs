import * as React from "react";

interface Props {
  contactName: string;
  universityName: string;
  fairName: string;
  proformaReference?: string | null;
  premiumDeadline: string | null;
}

function fmtDate(d: string | null): string {
  if (!d) return "the premium deadline";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function LogoReminderEmail({
  contactName,
  universityName,
  fairName,
  proformaReference,
  premiumDeadline,
}: Props) {
  const subj = proformaReference
    ? `Logo — ${universityName} — ${proformaReference}`
    : `Logo — ${universityName}`;
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
                padding: "26px 24px",
                borderRadius: "8px 8px 0 0",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                ⏰ Logo still pending
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
                padding: "26px 24px",
                borderRadius: "0 0 8px 8px",
              }}
            >
              <p style={{ margin: 0, fontSize: 16 }}>Dear {contactName},</p>
              <p style={{ marginTop: 16, lineHeight: 1.6 }}>
                We haven&rsquo;t received the university logo for{" "}
                <strong>{universityName}</strong>&rsquo;s Premium Booth yet.
                Your logo enables the branded backdrop, the print-ad
                placement, and your dedicated social-media campaign.
              </p>
              <div
                style={{
                  marginTop: 18,
                  padding: "14px 18px",
                  backgroundColor: "#FBF6E7",
                  border: "1px solid #E8D9A8",
                  borderRadius: 8,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "#374151",
                }}
              >
                <strong>Email to:</strong>{" "}
                <a
                  href="mailto:educationfair@iaesgujarat.org"
                  style={{ color: "#0B2B5C" }}
                >
                  educationfair@iaesgujarat.org
                </a>
                <br />
                <strong>Subject:</strong> {subj}
                <br />
                <strong>Format:</strong> PNG · min 300 dpi · transparent
                background preferred
                <br />
                <strong>By:</strong> {fmtDate(premiumDeadline)}
              </div>
              <p style={{ marginTop: 20, lineHeight: 1.6 }}>
                Need help? Call +91 9726480899.
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
