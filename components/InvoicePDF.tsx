"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { rupeesToWords } from "@/lib/invoice";
import type { Invoice, Registration, Fair, BillingDetails } from "@/types";

interface Props {
  registration: Registration;
  invoice: Invoice;
  fair: Fair;
  billing: BillingDetails | null;
}

const IAES = {
  name: "Indo American Education Society",
  addressL1: "3rd Floor, 301-302, Sun Square",
  addressL2: "Navarangpura, Ahmedabad - 380009, Gujarat",
  gstin: "24AAATI2674J1ZM",
  pan: "AAATI2674J",
  sac: "998596",
  stateCode: "24",
  phone: "+91 98255 93262",
  email: "eduadviser@iaesgujarat.org",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: "#0B2B5C",
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#C9A227",
    paddingBottom: 10,
  },
  brand: { fontSize: 22, fontWeight: 700, color: "#0B2B5C" },
  brandSub: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#C9A227",
    marginTop: 2,
  },
  invoiceLabel: {
    fontSize: 18,
    letterSpacing: 3,
    color: "#0B2B5C",
  },
  partiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  partyBlock: { width: "48%" },
  partyTitle: {
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6F7B8F",
    marginBottom: 4,
  },
  partyName: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  partyLine: { fontSize: 9, color: "#3A5A94", marginBottom: 1 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 20,
    backgroundColor: "#F5F7FA",
    padding: 10,
    borderRadius: 4,
  },
  metaItem: { flexDirection: "column", marginRight: 24, marginBottom: 4 },
  metaLabel: {
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6F7B8F",
  },
  metaValue: { fontSize: 10, fontWeight: 700, marginTop: 2 },
  table: {
    marginTop: 22,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#0B2B5C",
  },
  tableHead: {
    flexDirection: "row",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#0B2B5C",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E1E6EF",
  },
  tableRowTotal: {
    flexDirection: "row",
    paddingVertical: 9,
    backgroundColor: "#0B2B5C",
  },
  th: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#6F7B8F",
  },
  cellSac: { width: 56, paddingHorizontal: 6, fontSize: 9 },
  cellDesc: { flex: 3, paddingHorizontal: 6 },
  cellRate: { width: 80, paddingHorizontal: 6, textAlign: "right", fontSize: 9 },
  cellAmount: { width: 96, paddingHorizontal: 6, textAlign: "right" },
  totalText: { color: "#FFFFFF", fontWeight: 700 },
  words: { marginTop: 14, fontSize: 9, fontStyle: "italic", color: "#3A5A94" },
  tcSection: {
    marginTop: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  tcHeading: {
    fontSize: 8,
    fontWeight: 700,
    color: "#0B2B5C",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  tcText: {
    fontSize: 7,
    color: "#6B7280",
    lineHeight: 1.5,
    marginBottom: 3,
  },
  tcHighlight: {
    fontSize: 7,
    color: "#DC2626",
    marginBottom: 3,
  },
  tcUrl: {
    fontSize: 7,
    color: "#0B2B5C",
    textDecoration: "underline",
  },
  tcAcceptedBox: {
    marginTop: 8,
    backgroundColor: "#F0FDF4",
    padding: 8,
    borderRadius: 4,
  },
  tcAcceptedText: { fontSize: 7, color: "#166534" },
  footer: {
    marginTop: 18,
    fontSize: 8,
    color: "#6F7B8F",
    lineHeight: 1.5,
  },
});

function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}
function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtAcceptedAt(iso: string | null | undefined): string {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} ${d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  })} IST`;
}

function TermsSummary({ registration }: { registration: Registration }) {
  return (
    <View style={styles.tcSection}>
      <Text style={styles.tcHeading}>Terms &amp; Conditions — Summary</Text>
      <Text style={styles.tcText}>
        1. Maximum 2 representatives per counter space. Second table:
        USD 2,000 additional.
      </Text>
      <Text style={styles.tcText}>
        2. Transportation provided for official Event visits only — personal
        travel at the University&rsquo;s own cost.
      </Text>
      <Text style={styles.tcText}>
        3. IAES provides counter space, chairs, water, and meals during
        institutional visits and fairs.
      </Text>
      <Text style={styles.tcHighlight}>
        4. No-Show: No refund. Cancellation less than 15 days prior: No refund.
      </Text>
      <Text style={styles.tcText}>
        5. Cancellation 15–29 days: 25% refund · 30–59 days: 50% · 60+ days:
        75%. GST amounts are non-refundable in all cases.
      </Text>
      <Text style={styles.tcText}>
        6. IAES is not liable for Force Majeure events including unscheduled
        venue closures or cancellations.
      </Text>
      <Text style={styles.tcText}>
        7. Student data obtained at the Event is for admissions use only and
        must not be shared with third parties.
      </Text>
      <Text style={styles.tcText}>
        Full Terms &amp; Conditions:{" "}
        <Text style={styles.tcUrl}>
          https://fairs.iaesgujarat.org/terms
        </Text>
      </Text>
      <View style={styles.tcAcceptedBox}>
        <Text style={styles.tcAcceptedText}>
          ✓ Terms &amp; Conditions accepted by {registration.contact_name} on
          behalf of {registration.university_name}.
        </Text>
        <Text style={styles.tcAcceptedText}>
          Accepted on: {fmtAcceptedAt(registration.terms_accepted_at)} ·
          Version: {registration.terms_version || "2026.1"}
        </Text>
      </View>
    </View>
  );
}

export function InvoicePDF({ registration, invoice, fair, billing }: Props) {
  return invoice.payment_currency === "INR" ? (
    <InvoicePDFInr
      registration={registration}
      invoice={invoice}
      fair={fair}
      billing={billing}
    />
  ) : (
    <InvoicePDFUsd
      registration={registration}
      invoice={invoice}
      fair={fair}
    />
  );
}

function InvoicePDFUsd({
  registration,
  invoice,
  fair,
}: {
  registration: Registration;
  invoice: Invoice;
  fair: Fair;
}) {
  return (
    <Document
      title={`Invoice ${invoice.invoice_number}`}
      author={IAES.name}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>IAES</Text>
            <Text style={styles.brandSub}>EducationUSA Fairs · Gujarat</Text>
          </View>
          <Text style={styles.invoiceLabel}>INVOICE</Text>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyTitle}>From</Text>
            <Text style={styles.partyName}>{IAES.name}</Text>
            <Text style={styles.partyLine}>{IAES.addressL1}</Text>
            <Text style={styles.partyLine}>{IAES.addressL2}</Text>
            <Text style={styles.partyLine}>
              GSTIN: {IAES.gstin} · PAN: {IAES.pan}
            </Text>
            <Text style={styles.partyLine}>{IAES.email} · {IAES.phone}</Text>
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyTitle}>Billed To</Text>
            <Text style={styles.partyName}>{registration.university_name}</Text>
            <Text style={styles.partyLine}>{registration.contact_name}</Text>
            {registration.contact_title && (
              <Text style={styles.partyLine}>{registration.contact_title}</Text>
            )}
            <Text style={styles.partyLine}>{registration.contact_email}</Text>
            <Text style={styles.partyLine}>{registration.university_country}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Invoice No.</Text>
            <Text style={styles.metaValue}>{invoice.invoice_number}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaValue}>{fmtDate(invoice.issued_at)}</Text>
          </View>
          {invoice.due_date && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Due</Text>
              <Text style={styles.metaValue}>{fmtDate(invoice.due_date)}</Text>
            </View>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.cellSac, styles.th]}>SAC</Text>
            <Text style={[styles.cellDesc, styles.th]}>Description</Text>
            <Text style={[styles.cellAmount, styles.th]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellSac}>{IAES.sac}</Text>
            <Text style={styles.cellDesc}>
              Fair Booth — {registration.booth_type} ({fair.name})
            </Text>
            <Text style={styles.cellAmount}>
              {fmtUSD(Number(invoice.base_amount_usd))}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellSac}> </Text>
            <Text style={[styles.cellDesc, { fontSize: 9, color: "#6F7B8F", fontStyle: "italic" }]}>
              GST: Not applicable (Export of service — zero rated)
            </Text>
            <Text style={styles.cellAmount}>—</Text>
          </View>
          <View style={styles.tableRowTotal}>
            <Text style={styles.cellSac}> </Text>
            <Text style={[styles.cellDesc, styles.totalText]}>TOTAL</Text>
            <Text style={[styles.cellAmount, styles.totalText]}>
              {fmtUSD(Number(invoice.total_amount_usd))}
            </Text>
          </View>
        </View>

        <TermsSummary registration={registration} />

        <Text style={styles.footer}>
          Payment terms: Due by the date above. Payments may be made online via
          Razorpay International (card) or by international wire transfer.
          {"\n"}For wire-transfer details, contact {IAES.email}.
          {"\n\n"}This invoice is electronically generated and valid without signature.
        </Text>
      </Page>
    </Document>
  );
}

function InvoicePDFInr({
  registration,
  invoice,
  fair,
  billing,
}: {
  registration: Registration;
  invoice: Invoice;
  fair: Fair;
  billing: BillingDetails | null;
}) {
  return (
    <Document
      title={`Tax Invoice ${invoice.invoice_number}`}
      author={IAES.name}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>IAES</Text>
            <Text style={styles.brandSub}>EducationUSA Fairs · Gujarat</Text>
          </View>
          <Text style={styles.invoiceLabel}>TAX INVOICE</Text>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyTitle}>From</Text>
            <Text style={styles.partyName}>{IAES.name}</Text>
            <Text style={styles.partyLine}>{IAES.addressL1}</Text>
            <Text style={styles.partyLine}>{IAES.addressL2}</Text>
            <Text style={styles.partyLine}>
              GSTIN: {IAES.gstin} · PAN: {IAES.pan}
            </Text>
            <Text style={styles.partyLine}>
              State Code: {IAES.stateCode} · SAC: {IAES.sac}
            </Text>
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyTitle}>Billed To</Text>
            {billing ? (
              <>
                <Text style={styles.partyName}>{billing.legal_name}</Text>
                <Text style={styles.partyLine}>{billing.billing_address}</Text>
                <Text style={styles.partyLine}>
                  {billing.city}, {billing.state} - {billing.pin_code}
                </Text>
                <Text style={styles.partyLine}>PAN: {billing.pan_number}</Text>
                <Text style={styles.partyLine}>
                  GSTIN: {billing.gstin || "Unregistered"}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.partyName}>{registration.university_name}</Text>
                <Text style={styles.partyLine}>{registration.contact_name}</Text>
                <Text style={styles.partyLine}>{registration.contact_email}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Invoice No.</Text>
            <Text style={styles.metaValue}>{invoice.invoice_number}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaValue}>{fmtDate(invoice.issued_at)}</Text>
          </View>
          {invoice.due_date && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Due</Text>
              <Text style={styles.metaValue}>{fmtDate(invoice.due_date)}</Text>
            </View>
          )}
          {invoice.forex_rate_used && invoice.forex_rate_date && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Forex Rate</Text>
              <Text style={styles.metaValue}>
                1 USD = ₹{Number(invoice.forex_rate_used).toFixed(2)}
              </Text>
              <Text style={[styles.partyLine, { fontSize: 7 }]}>
                as on {fmtDate(invoice.forex_rate_date)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.cellSac, styles.th]}>SAC</Text>
            <Text style={[styles.cellDesc, styles.th]}>Description</Text>
            <Text style={[styles.cellRate, styles.th]}>Rate</Text>
            <Text style={[styles.cellAmount, styles.th]}>Amount (₹)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellSac}>{IAES.sac}</Text>
            <Text style={styles.cellDesc}>
              Fair Booth — {registration.booth_type} ({fair.name})
            </Text>
            <Text style={styles.cellRate}>
              USD {Number(invoice.base_amount_usd).toFixed(2)}
            </Text>
            <Text style={styles.cellAmount}>
              {fmtINR(Number(invoice.base_amount_inr || 0))}
            </Text>
          </View>

          {invoice.gst_type === "CGST_SGST" && (
            <>
              <View style={styles.tableRow}>
                <Text style={styles.cellSac}> </Text>
                <Text style={styles.cellDesc}>
                  CGST @ {Number(invoice.cgst_percent)}%
                </Text>
                <Text style={styles.cellRate}> </Text>
                <Text style={styles.cellAmount}>
                  {fmtINR(Number(invoice.cgst_amount))}
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.cellSac}> </Text>
                <Text style={styles.cellDesc}>
                  SGST @ {Number(invoice.sgst_percent)}%
                </Text>
                <Text style={styles.cellRate}> </Text>
                <Text style={styles.cellAmount}>
                  {fmtINR(Number(invoice.sgst_amount))}
                </Text>
              </View>
            </>
          )}

          {invoice.gst_type === "IGST" && (
            <View style={styles.tableRow}>
              <Text style={styles.cellSac}> </Text>
              <Text style={styles.cellDesc}>
                IGST @ {Number(invoice.igst_percent)}%
              </Text>
              <Text style={styles.cellRate}> </Text>
              <Text style={styles.cellAmount}>
                {fmtINR(Number(invoice.igst_amount))}
              </Text>
            </View>
          )}

          <View style={styles.tableRowTotal}>
            <Text style={styles.cellSac}> </Text>
            <Text style={[styles.cellDesc, styles.totalText]}>TOTAL</Text>
            <Text style={styles.cellRate}> </Text>
            <Text style={[styles.cellAmount, styles.totalText]}>
              {fmtINR(Number(invoice.total_amount_inr || 0))}
            </Text>
          </View>
        </View>

        <Text style={styles.words}>
          Amount in words: {rupeesToWords(Number(invoice.total_amount_inr || 0))}
        </Text>

        <TermsSummary registration={registration} />

        <Text style={styles.footer}>
          Payment terms: Due by the date above. Payments may be made online via
          Razorpay (card / UPI / netbanking) or by wire transfer.
          {"\n"}For wire-transfer details, contact {IAES.email}.
          {"\n\n"}This is an electronically generated tax invoice and is valid without signature.
        </Text>
      </Page>
    </Document>
  );
}
