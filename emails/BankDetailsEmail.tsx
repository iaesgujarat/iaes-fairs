import * as React from "react";
import { IAES_BANK_INR_ROWS, IAES_BANK_USD_ROWS } from "@/lib/iaesBank";

/**
 * Email-safe IAES bank details for the BODY of pre-payment emails
 * (proforma / premium / invoice), so a recipient who never opens the PDF
 * attachment can still pay. Same single source of truth as the PDF +
 * on-screen invoice (lib/iaesBank.ts). Blocks are stacked full-width
 * (not two columns) for legibility in mobile email clients.
 */

function BankBlock({
  title,
  rows,
}: {
  title: string;
  rows: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <div
      style={{
        marginTop: 12,
        border: "1px solid #E1E6EF",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <p
        style={{
          margin: 0,
          padding: "8px 12px",
          backgroundColor: "#FFF8E1",
          fontSize: 12,
          fontWeight: 700,
          color: "#92400E",
        }}
      >
        {title}
      </p>
      <table width="100%" style={{ borderCollapse: "collapse" }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  color: "#6F7B8F",
                  width: 150,
                  verticalAlign: "top",
                  borderTop: "1px solid #F0F2F6",
                }}
              >
                {label}
              </td>
              <td
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  color: "#0B2B5C",
                  fontWeight: 600,
                  borderTop: "1px solid #F0F2F6",
                }}
              >
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BankDetailsEmail() {
  return (
    <div style={{ marginTop: 22 }}>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: "#0B2B5C",
        }}
      >
        IAES Bank Details — for payment by transfer
      </p>
      <BankBlock
        title="Center's Bank Details for Local Currency (INR) Payment"
        rows={IAES_BANK_INR_ROWS}
      />
      <BankBlock
        title="Correspondent bank detail for USD currency"
        rows={IAES_BANK_USD_ROWS}
      />
    </div>
  );
}
