import * as React from "react";

interface Props {
  repName: string;
  universityName: string;
  fairName: string;
  fairCity: string;
  scansCount: number;
  interestedCount: number;
  totalUniversities: number;
  portalLink: string;
  portalExpiresAt: string;
  surveyLink: string;
}

export function UniversityThankYouEmail({
  repName,
  universityName,
  fairName,
  fairCity,
  scansCount,
  interestedCount,
  totalUniversities,
  portalLink,
  portalExpiresAt,
  surveyLink,
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
                &#9733;
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 14 }}>
                Thank You for Participating
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
              <p style={{ margin: 0, fontSize: 16 }}>Dear {repName},</p>
              <p style={{ marginTop: 16, lineHeight: 1.6 }}>
                Thank you for participating in the {fairName} in {fairCity}.
                It was a pleasure having <strong>{universityName}</strong> as
                part of our tour.
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
                Your Booth Engagement
              </div>
              <table
                width="100%"
                style={{ marginTop: 8, borderCollapse: "collapse" }}
              >
                <tbody>
                  {[
                    ["Students who visited your booth", `${scansCount}`],
                    ["Students you marked Interested", `${interestedCount}`],
                    ["Universities at the fair", `${totalUniversities}`],
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

              <div
                style={{
                  marginTop: 24,
                  padding: "18px 20px",
                  backgroundColor: "#F5F7FA",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                  Your Leads Portal
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 13,
                    color: "#6F7B8F",
                    lineHeight: 1.5,
                  }}
                >
                  Access your complete student list with profiles and your
                  notes. Available for 30 days (until {portalExpiresAt}).
                </p>
                <a
                  href={portalLink}
                  style={{
                    display: "inline-block",
                    marginTop: 14,
                    backgroundColor: "#0B2B5C",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    padding: "11px 22px",
                    borderRadius: 6,
                  }}
                >
                  View Your Student Leads &rarr;
                </a>
              </div>

              <div
                style={{
                  marginTop: 16,
                  padding: "16px 20px",
                  border: "1px solid #E1E6EF",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                  How did the fair go for you?
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 13,
                    color: "#6F7B8F",
                    lineHeight: 1.5,
                  }}
                >
                  Two minutes of honest feedback helps us make the next IAES
                  fair better for you.
                </p>
                <a
                  href={surveyLink}
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    border: "1px solid #0B2B5C",
                    color: "#0B2B5C",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    padding: "10px 22px",
                    borderRadius: 6,
                  }}
                >
                  Share Your Feedback &rarr;
                </a>
              </div>

              <p style={{ marginTop: 24, lineHeight: 1.6 }}>
                <strong>What&rsquo;s next:</strong> we&rsquo;ll announce the
                next IAES fair soon. Past participants receive priority
                notification and early bird pricing automatically.
              </p>

              <p style={{ marginTop: 16, lineHeight: 1.6 }}>
                For queries about this fair or the next one:{" "}
                <a
                  href="mailto:educationfair@iaesgujarat.org"
                  style={{ color: "#0B2B5C" }}
                >
                  educationfair@iaesgujarat.org
                </a>{" "}
                &middot; +91 9726480899
              </p>

              <p style={{ marginTop: 24, lineHeight: 1.6 }}>
                Warm regards,
                <br />
                <strong>IAES Team</strong>
                <br />
                Indo American Education Society · Ahmedabad, Gujarat, India
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
