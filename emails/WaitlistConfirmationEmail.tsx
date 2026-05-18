import * as React from "react";

interface Props {
  universityName: string;
  contactName?: string | null;
}

export function WaitlistConfirmationEmail({
  universityName,
  contactName,
}: Props) {
  const greetingName = contactName?.trim() || "Team";

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
                You&rsquo;re on the List
              </div>
              <div style={{ fontSize: 13, color: "#C9A227", marginTop: 4 }}>
                IAES Education Fairs
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
              <p style={{ margin: 0, fontSize: 16 }}>Dear {greetingName},</p>

              <p style={{ marginTop: 16, lineHeight: 1.6 }}>
                Thank you for your interest in the IAES U.S. University
                Education Fair. We&rsquo;ve added{" "}
                <strong>{universityName}</strong> to our priority list for
                the next fair.
              </p>

              <table
                width="100%"
                style={{ marginTop: 24, borderCollapse: "collapse" }}
              >
                <tbody>
                  {[
                    [
                      "📧 First to know",
                      "You&rsquo;ll get an email the moment registration opens — before the public announcement.",
                    ],
                    [
                      "⭐ Early bird reserved",
                      "Your early bird pricing is held, so you save automatically when you register.",
                    ],
                    [
                      "✅ Nothing to do now",
                      "No action is needed until registration opens. We&rsquo;ll reach out to you.",
                    ],
                  ].map(([title, body]) => (
                    <tr key={title}>
                      <td
                        style={{
                          padding: "12px 0",
                          borderBottom: "1px solid #E1E6EF",
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {title}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#6F7B8F",
                            marginTop: 4,
                            lineHeight: 1.5,
                          }}
                          dangerouslySetInnerHTML={{ __html: body }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p style={{ marginTop: 24, lineHeight: 1.6 }}>
                Questions about upcoming fairs?{" "}
                <a
                  href="mailto:educationfair@iaesgujarat.org"
                  style={{ color: "#0B2B5C" }}
                >
                  educationfair@iaesgujarat.org
                </a>{" "}
                &middot; +91 9825593262
              </p>

              <p style={{ marginTop: 24, lineHeight: 1.6 }}>
                Talk soon,
                <br />
                <strong>IAES Team</strong>
                <br />
                Indo American Education Society · Ahmedabad
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
              fairs.iaesgujarat.org · You received this because you signed up
              for IAES fair updates.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
