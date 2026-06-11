import * as React from "react";

interface Props {
  officialName: string;
  institutionName: string;
  fairName: string;
  studyPrograms: string[];
  approxParticipants: string;
  proposedDatetime: string;
}

/**
 * Instant acknowledgment to the institution official when they submit a
 * campus-visit request. Not a confirmation — IAES reviews each request
 * and replies personally (the request lands in the admin Campus Hosts
 * tab + an internal alert email).
 */
export function CampusHostRequestReceivedEmail({
  officialName,
  institutionName,
  fairName,
  studyPrograms,
  approxParticipants,
  proposedDatetime,
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
                  color: "#0B2B5C",
                }}
              >
                &#9993;
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 14 }}>
                Request Received
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
              <p style={{ margin: 0, fontSize: 16 }}>Dear {officialName},</p>
              <p style={{ marginTop: 16, lineHeight: 1.6 }}>
                Thank you — we&rsquo;ve received{" "}
                <strong>{institutionName}</strong>&rsquo;s request to host
                visiting U.S. university representatives on your campus.
              </p>

              <table
                width="100%"
                style={{ marginTop: 24, borderCollapse: "collapse" }}
              >
                <tbody>
                  {[
                    ["Institution", institutionName],
                    ["Study programs", studyPrograms.join(", ") || "—"],
                    ["Approx. participants", approxParticipants],
                    ["Proposed slot", proposedDatetime],
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
                <strong>What happens next:</strong> the IAES team reviews every
                campus-visit request against the visiting universities&rsquo;
                itinerary. We&rsquo;ll be in touch by email or phone to discuss
                feasibility and scheduling — please allow a few working days.
              </p>
              <p style={{ marginTop: 12, lineHeight: 1.6, fontSize: 13, color: "#6F7B8F" }}>
                This acknowledgment is not a confirmation of the visit; campus
                visits depend on the reps&rsquo; travel itinerary.
              </p>

              <p style={{ marginTop: 16, lineHeight: 1.6 }}>
                Questions in the meantime?{" "}
                <a
                  href="mailto:eduadviser@iaesgujarat.org"
                  style={{ color: "#0B2B5C" }}
                >
                  eduadviser@iaesgujarat.org
                </a>{" "}
                &middot; +91 9726480899
              </p>

              <p style={{ marginTop: 24, lineHeight: 1.6 }}>
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
