import * as React from "react";

/**
 * Shared chrome for transactional emails — navy header, white body,
 * subtle footer. Use this from each email template so they look
 * consistent without duplicating table soup.
 */
export function MailerLayout({
  preheader,
  eyebrow,
  title,
  children,
  footerNote,
}: {
  /** Tiny text shown in inbox preview (Gmail/Apple Mail "preheader"). */
  preheader?: string;
  /** Small label above the title (e.g. "TAX INVOICE", "REGISTRATION"). */
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  /** Bottom-of-email centred note (defaults to the IAES contact line). */
  footerNote?: React.ReactNode;
}) {
  return (
    <div
      style={{
        fontFamily: "Helvetica, Arial, sans-serif",
        color: "#0B2B5C",
        backgroundColor: "#F5F7FA",
        padding: "40px 20px",
      }}
    >
      {preheader && (
        <div
          style={{
            display: "none",
            overflow: "hidden",
            color: "#F5F7FA",
            opacity: 0,
            height: 0,
            width: 0,
          }}
        >
          {preheader}
        </div>
      )}
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
              {eyebrow && (
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "#C9A227",
                  }}
                >
                  {eyebrow}
                </div>
              )}
              <div
                style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}
              >
                {title}
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
              {children}
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
              {footerNote ?? (
                <>
                  Indo American Education Society &middot;
                  fairs.iaesgujarat.org
                  <br />
                  GSTIN: 24AAATI2674J1ZM &middot; eduadviser@iaesgujarat.org
                </>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export const CTA_BUTTON_STYLE: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#C9A227",
  color: "#0B2B5C",
  fontWeight: 600,
  padding: "14px 28px",
  borderRadius: 6,
  textDecoration: "none",
  fontSize: 14,
};

export const SECONDARY_BUTTON_STYLE: React.CSSProperties = {
  display: "inline-block",
  border: "1px solid #0B2B5C",
  color: "#0B2B5C",
  fontWeight: 600,
  padding: "12px 22px",
  borderRadius: 6,
  textDecoration: "none",
  fontSize: 13,
};
