import * as React from "react";

// Internal-only notification email. Visually distinct from
// customer-facing templates (gold "ADMIN ALERT" pill instead of the
// green check) so staff can recognise it at a glance. Generic shape:
// title + subtitle + rows + optional CTA button.

interface Row {
  label: string;
  value: string;
}

interface Props {
  title: string;
  subtitle: string;
  rows: Row[];
  ctaUrl?: string;
  ctaLabel?: string;
  /** Short note shown above the CTA / footer (optional). */
  note?: string;
}

export function AdminNotificationEmail({
  title,
  subtitle,
  rows,
  ctaUrl,
  ctaLabel,
  note,
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
                padding: "24px",
                borderRadius: "8px 8px 0 0",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  backgroundColor: "#C9A227",
                  color: "#0B2B5C",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  padding: "3px 10px",
                  borderRadius: 99,
                  textTransform: "uppercase",
                }}
              >
                Admin Alert
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, marginTop: 12 }}>
                {title}
              </div>
              <div style={{ fontSize: 13, color: "#C9A227", marginTop: 4 }}>
                {subtitle}
              </div>
            </td>
          </tr>
          <tr>
            <td
              style={{
                backgroundColor: "#fff",
                padding: "24px",
                borderRadius: ctaUrl ? "0" : "0 0 8px 8px",
              }}
            >
              <table
                width="100%"
                style={{ borderCollapse: "collapse" }}
              >
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label}>
                      <td
                        style={{
                          padding: "9px 0",
                          color: "#6F7B8F",
                          borderBottom: "1px solid #E1E6EF",
                          fontSize: 12,
                          verticalAlign: "top",
                          width: "38%",
                        }}
                      >
                        {r.label}
                      </td>
                      <td
                        style={{
                          padding: "9px 0",
                          textAlign: "right",
                          fontWeight: 600,
                          borderBottom: "1px solid #E1E6EF",
                          fontSize: 13,
                          color: "#0B2B5C",
                        }}
                      >
                        {r.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {note && (
                <p
                  style={{
                    marginTop: 18,
                    marginBottom: 0,
                    fontSize: 12,
                    color: "#6F7B8F",
                    lineHeight: 1.55,
                  }}
                >
                  {note}
                </p>
              )}
            </td>
          </tr>
          {ctaUrl && (
            <tr>
              <td
                style={{
                  backgroundColor: "#fff",
                  padding: "0 24px 24px",
                  borderRadius: "0 0 8px 8px",
                  textAlign: "center",
                }}
              >
                <a
                  href={ctaUrl}
                  style={{
                    display: "inline-block",
                    backgroundColor: "#0B2B5C",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    padding: "10px 22px",
                    borderRadius: 6,
                    textDecoration: "none",
                  }}
                >
                  {ctaLabel ?? "Open in admin"} &rarr;
                </a>
              </td>
            </tr>
          )}
          <tr>
            <td
              style={{
                fontSize: 11,
                color: "#9AA4B8",
                textAlign: "center",
                padding: "14px 24px",
              }}
            >
              Internal notification &middot; fairs.iaesgujarat.org
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
