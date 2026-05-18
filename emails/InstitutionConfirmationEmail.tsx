import * as React from "react";

interface Props {
  contactName: string;
  institutionName: string;
  city: string;
  state: string;
  expectedStudentCount: number;
  fairName: string;
  fairDateRange: string;
  venue: string;
}

export function InstitutionConfirmationEmail({
  contactName,
  institutionName,
  city,
  state,
  expectedStudentCount,
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
                Registration Confirmed
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
                Thank you for registering <strong>{institutionName}</strong> for
                the {fairName}. Your institution is confirmed.
              </p>

              <table
                width="100%"
                style={{ marginTop: 24, borderCollapse: "collapse" }}
              >
                <tbody>
                  {[
                    ["Institution", institutionName],
                    ["Location", `${city}, ${state}`],
                    ["Expected Students", `${expectedStudentCount}`],
                    ["Fair Dates", fairDateRange],
                    ["Venue", venue],
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
                We&rsquo;ll share the detailed programme, venue information,
                and student briefing pack closer to the fair date.
              </p>

              <p style={{ marginTop: 16, lineHeight: 1.6 }}>
                Questions?{" "}
                <a
                  href="mailto:eduadviser@iaesgujarat.org"
                  style={{ color: "#0B2B5C" }}
                >
                  eduadviser@iaesgujarat.org
                </a>{" "}
                &middot; +91 9726480899
              </p>

              <p style={{ marginTop: 24, lineHeight: 1.6 }}>
                See you in Ahmedabad!
                <br />
                <strong>IAES Team</strong>
                <br />
                Indo American Education Society
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
