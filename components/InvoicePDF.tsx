"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

interface Props {
  invoiceNumber: string;
  issuedDate: string;
  dueDate?: string | null;
  universityName: string;
  contactName: string;
  contactEmail: string;
  boothType: string;
  amountInr: number;
  gstAmountInr: number;
  totalAmountInr: number;
}

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 11,
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
    paddingBottom: 12,
  },
  brand: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0B2B5C",
  },
  brandSub: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#C9A227",
    marginTop: 2,
  },
  invoiceLabel: {
    fontSize: 20,
    letterSpacing: 4,
    color: "#0B2B5C",
  },
  partiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  partyBlock: {
    width: "48%",
  },
  partyTitle: {
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6F7B8F",
    marginBottom: 6,
  },
  partyName: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 2,
  },
  partyLine: {
    fontSize: 10,
    color: "#3A5A94",
    marginBottom: 1,
  },
  metaRow: {
    flexDirection: "row",
    marginTop: 24,
    backgroundColor: "#F5F7FA",
    padding: 12,
    borderRadius: 4,
  },
  metaItem: { flexDirection: "column", marginRight: 32 },
  metaLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6F7B8F",
  },
  metaValue: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 2,
  },
  table: {
    marginTop: 28,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#0B2B5C",
  },
  tableHead: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#0B2B5C",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E1E6EF",
  },
  tableRowTotal: {
    flexDirection: "row",
    paddingVertical: 10,
    backgroundColor: "#0B2B5C",
    color: "#FFFFFF",
  },
  th: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#6F7B8F",
  },
  cellLeft: { flex: 3, paddingHorizontal: 8 },
  cellRight: { flex: 1, paddingHorizontal: 8, textAlign: "right" },
  totalText: { color: "#FFFFFF", fontWeight: 700 },
  footer: {
    marginTop: 36,
    fontSize: 9,
    color: "#6F7B8F",
    lineHeight: 1.6,
  },
  stamp: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#E1E6EF",
    fontSize: 9,
    color: "#6F7B8F",
  },
});

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function InvoicePDF(props: Props) {
  return (
    <Document
      title={`Invoice ${props.invoiceNumber}`}
      author="Indo American Education Society"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>IAES</Text>
            <Text style={styles.brandSub}>
              EducationUSA Fairs · Gujarat
            </Text>
          </View>
          <Text style={styles.invoiceLabel}>INVOICE</Text>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyTitle}>From</Text>
            <Text style={styles.partyName}>Indo American Education Society</Text>
            <Text style={styles.partyLine}>Ahmedabad, Gujarat, India</Text>
            <Text style={styles.partyLine}>eduadviser@iaesgujarat.org</Text>
            <Text style={styles.partyLine}>+91 98255 93262</Text>
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyTitle}>Billed To</Text>
            <Text style={styles.partyName}>{props.universityName}</Text>
            <Text style={styles.partyLine}>{props.contactName}</Text>
            <Text style={styles.partyLine}>{props.contactEmail}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Invoice No.</Text>
            <Text style={styles.metaValue}>{props.invoiceNumber}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaValue}>{formatDate(props.issuedDate)}</Text>
          </View>
          {props.dueDate && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Due</Text>
              <Text style={styles.metaValue}>{formatDate(props.dueDate)}</Text>
            </View>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.cellLeft, styles.th]}>Description</Text>
            <Text style={[styles.cellRight, styles.th]}>Amount (INR)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellLeft}>
              Fair Booth — {props.boothType}
            </Text>
            <Text style={styles.cellRight}>{formatINR(props.amountInr)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellLeft}>GST @ 18%</Text>
            <Text style={styles.cellRight}>
              {formatINR(props.gstAmountInr)}
            </Text>
          </View>
          <View style={styles.tableRowTotal}>
            <Text style={[styles.cellLeft, styles.totalText]}>TOTAL</Text>
            <Text style={[styles.cellRight, styles.totalText]}>
              {formatINR(props.totalAmountInr)}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Payment terms: Due by the date above. Payments may be made online via
          Razorpay (card, UPI, netbanking) or by international wire transfer.
          {"\n"}For wire-transfer details, contact eduadviser@iaesgujarat.org.
        </Text>

        <Text style={styles.stamp}>
          IAES is a registered not-for-profit institution in Gujarat, India.
          This invoice is electronically generated and valid without signature.
        </Text>
      </Page>
    </Document>
  );
}
