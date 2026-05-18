import * as React from "react";

interface Props {
  studentName: string;
  institutionName: string | null;
  fairName: string;
  fairCity: string;
  boothsVisited: number;
}

export function StudentThankYouEmail({
  studentName,
  institutionName,
  fairName,
  fairCity,
  boothsVisited,
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
                &#127891;
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 14 }}>
                Thank You for Attending
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
              <p style={{ margin: 0, fontSize: 16 }}>Dear {studentName},</p>
              <p style={{ marginTop: 16, lineHeight: 1.6 }}>
                Thank you for attending the {fairName} in {fairCity}.
                {institutionName
                  ? ` It was wonderful to see so many bright students from ${institutionName}.`
                  : ""}
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
                Your Fair Summary
              </div>
              <table
                width="100%"
                style={{ marginTop: 8, borderCollapse: "collapse" }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: "10px 0",
                        color: "#6F7B8F",
                        borderBottom: "1px solid #E1E6EF",
                        fontSize: 13,
                      }}
                    >
                      University booths you visited
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
                      {boothsVisited}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p style={{ marginTop: 20, lineHeight: 1.6 }}>
                The universities you met are reviewing student profiles.
                Watch your inbox — they may reach out directly.
              </p>

              <div
                style={{
                  marginTop: 20,
                  padding: "14px 18px",
                  backgroundColor: "#F5F7FA",
                  borderRadius: 8,
                }}
              >
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                  Next fair
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 13,
                    color: "#6F7B8F",
                    lineHeight: 1.5,
                  }}
                >
                  You&rsquo;re already on our notification list. ✅ We&rsquo;ll
                  email you when the next fair opens for registration.
                </p>
              </div>

              <p style={{ marginTop: 24, lineHeight: 1.6 }}>
                Best of luck with your applications!
                <br />
                <br />
                <strong>IAES Team</strong>
                <br />
                Indo American Education Society, Ahmedabad
                <br />
                <a
                  href="mailto:educationfair@iaesgujarat.org"
                  style={{ color: "#0B2B5C" }}
                >
                  educationfair@iaesgujarat.org
                </a>{" "}
                &middot; +91 9726480899
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
