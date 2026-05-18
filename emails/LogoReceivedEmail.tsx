import * as React from "react";

interface Props {
  contactName: string;
  universityName: string;
  fairName: string;
}

const CHECKLIST = [
  "Booth: 2 tables · 4 reps",
  "Branded backdrop — logo confirmed ✅",
  "Print ad placement — logo queued ✅",
  "Social media campaign — in preparation",
  "Vernacular volunteer — being arranged",
];

export function LogoReceivedEmail({
  contactName,
  universityName,
  fairName,
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
                padding: "26px 24px",
                borderRadius: "8px 8px 0 0",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                ✅ Logo confirmed
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
                We have received <strong>{universityName}</strong>&rsquo;s
                logo. Thank you! Your Premium Booth is now fully set up:
              </p>
              <table
                width="100%"
                style={{ marginTop: 16, borderCollapse: "collapse" }}
              >
                <tbody>
                  {CHECKLIST.map((c) => (
                    <tr key={c}>
                      <td
                        style={{
                          padding: "8px 0",
                          borderBottom: "1px solid #E1E6EF",
                          fontSize: 13,
                          color: "#374151",
                        }}
                      >
                        <span style={{ color: "#C9A227" }}>&#10003;</span> {c}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: 20, lineHeight: 1.6 }}>
                We&rsquo;ll share your complete fair briefing about 4 weeks
                before the event. See you in Ahmedabad!
                <br />
                <br />
                <strong>IAES Team</strong>
                <br />
                Indo American Education Society
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
