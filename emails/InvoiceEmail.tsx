import * as React from "react";

interface Props {
  contactName: string;
  universityName: string;
  fairName: string;
  invoiceNumber: string;
  amountInr: number;
  dueDate?: string | null;
  payUrl: string;
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function InvoiceEmail({
  contactName,
  universityName,
  fairName,
  invoiceNumber,
  amountInr,
  dueDate,
  payUrl,
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
                  fontSize: 13,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#C9A227",
                }}
              >
                IAES &middot; Indo American Education Society
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>
                Invoice for {fairName}
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
                Thank you for registering <strong>{universityName}</strong> for
                the {fairName}. Please find your invoice details below.
              </p>

              <table
                width="100%"
                style={{
                  marginTop: 24,
                  borderTop: "1px solid #E1E6EF",
                  borderBottom: "1px solid #E1E6EF",
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ padding: "12px 0", color: "#6F7B8F" }}>
                      Invoice Number
                    </td>
                    <td
                      style={{
                        padding: "12px 0",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {invoiceNumber}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "12px 0", color: "#6F7B8F" }}>
                      Amount Due
                    </td>
                    <td
                      style={{
                        padding: "12px 0",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {formatINR(amountInr)}{" "}
                      <span
                        style={{
                          fontWeight: 400,
                          color: "#6F7B8F",
                          fontSize: 12,
                        }}
                      >
                        (incl. 18% GST)
                      </span>
                    </td>
                  </tr>
                  {dueDate && (
                    <tr>
                      <td style={{ padding: "12px 0", color: "#6F7B8F" }}>
                        Due Date
                      </td>
                      <td
                        style={{
                          padding: "12px 0",
                          textAlign: "right",
                          fontWeight: 600,
                        }}
                      >
                        {new Date(dueDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div style={{ textAlign: "center", marginTop: 32 }}>
                <a
                  href={payUrl}
                  style={{
                    display: "inline-block",
                    backgroundColor: "#C9A227",
                    color: "#0B2B5C",
                    fontWeight: 600,
                    padding: "14px 28px",
                    borderRadius: 6,
                    textDecoration: "none",
                  }}
                >
                  Pay Now &rarr;
                </a>
              </div>

              <p
                style={{
                  marginTop: 28,
                  fontSize: 13,
                  color: "#6F7B8F",
                  lineHeight: 1.6,
                }}
              >
                For wire transfer or demand-draft payment, contact us at{" "}
                <a
                  href="mailto:eduadviser@iaesgujarat.org"
                  style={{ color: "#0B2B5C" }}
                >
                  eduadviser@iaesgujarat.org
                </a>
                .
              </p>

              <p style={{ marginTop: 24, lineHeight: 1.6 }}>
                Warm regards,
                <br />
                <strong>IAES Team</strong>
                <br />
                Indo American Education Society
                <br />
                +91 98255 93262
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
              This is a transactional email regarding your fair registration.
              <br />
              fairs.iaesgujarat.org
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
