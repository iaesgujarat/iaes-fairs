// Isomorphic: rendered client-side via PDFDownloadLink (InvoiceActions)
// AND server-side via renderToBuffer (lib/invoicePdf) for email
// attachments — so no "use client" directive.
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  Invoice,
  Registration,
  Fair,
  FairItineraryStop,
  BillingDetails,
} from "@/types";
import { BankDetailsPDF } from "./BankDetailsPDF";
import { ItineraryBlockPDF } from "./ItineraryBlockPDF";
import { IAES_LOGO_PATH } from "@/lib/brand";
import { calculateGST } from "@/lib/gst";
import { getAttnRecipient } from "@/lib/billTo";

interface Props {
  registration: Registration;
  invoice: Invoice;
  fair: Fair;
  /** v19 — present only when an India office is the billed party
   *  (Mode B). Drives the billed-to block + indicative GST. */
  billing?: BillingDetails | null;
  itinerary?: FairItineraryStop[];
  /** Logo source. Defaults to the public path (works client-side).
   *  Server renders (email attachments) pass a data-URI. */
  logoSrc?: string;
}

const IAES = {
  name: "Indo American Education Society",
  addressL1: "3rd Floor, 301-302, Sun Square",
  addressL2: "Navarangpura, Ahmedabad - 380009, Gujarat",
  gstin: "24AAATI2674J1ZM",
  pan: "AAATI2674J",
  sac: "998596",
  phone: "+91 97264 80899",
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
  logo: { width: 48, height: 48, marginBottom: 4 },
  brandSub: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#C9A227",
    marginTop: 2,
  },
  proformaLabel: {
    fontSize: 18,
    letterSpacing: 3,
    color: "#92400E",
    fontWeight: 700,
  },
  proformaSubLabel: {
    fontSize: 8,
    color: "#92400E",
    marginTop: 2,
    textAlign: "right",
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
    backgroundColor: "#FFF8E1",
    padding: 10,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#C9A227",
  },
  metaItem: { flexDirection: "column", marginRight: 24, marginBottom: 4 },
  metaLabel: {
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#92400E",
  },
  metaValue: { fontSize: 11, fontWeight: 700, marginTop: 2, color: "#0B2B5C" },
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
  cellAmount: { width: 96, paddingHorizontal: 6, textAlign: "right" },
  totalText: { color: "#FFFFFF", fontWeight: 700 },
  disclaimer: {
    marginTop: 22,
    padding: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 4,
    fontSize: 8,
    color: "#92400E",
    lineHeight: 1.5,
  },
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

export function ProformaInvoicePDF({
  registration,
  invoice,
  fair,
  billing = null,
  itinerary = [],
  logoSrc = IAES_LOGO_PATH,
}: Props) {
  // v19 — Mode B (India office pays in INR): a separate legal entity
  // is billed, and an indicative GST estimate is shown so the office
  // can approve the all-in cost. The stored proforma row carries no
  // GST (it's snapshotted at order time), so estimate it at render.
  const isIndiaOffice = invoice.payment_currency === "INR" && !!billing;
  const attn = getAttnRecipient(registration);
  const gstEst = isIndiaOffice
    ? calculateGST(
        "INR",
        Number(invoice.base_amount_usd ?? 0),
        Number(invoice.forex_rate_used ?? 0),
        billing!.state,
        !!billing!.is_gst_registered
      )
    : null;

  const baseUSD =
    Number(invoice.base_amount_usd ?? 0) -
    Number(registration.addon_cost_usd || 0);
  const addonTables = Number(registration.addon_tables || 0);
  const addonReps = Number(registration.addon_reps || 0);
  const extraTableUSD = Number(fair.price_extra_table_usd ?? 300);
  const extraRepUSD = Number(fair.price_extra_rep_usd ?? 100);
  const tierLabel =
    registration.pricing_tier === "EARLYBIRD" ? "Early Bird" : "Standard";
  const totalUSD = Number(invoice.total_amount_usd ?? invoice.base_amount_usd ?? 0);
  const indicativeINR = Number(invoice.base_amount_inr ?? 0);
  const ref = invoice.proforma_reference ?? "PI-PENDING";

  return (
    <Document
      title={`Proforma ${ref}`}
      author={IAES.name}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Image src={logoSrc} style={styles.logo} />
            <Text style={styles.brandSub}>International Education Fairs · Gujarat</Text>
          </View>
          <View>
            <Text style={styles.proformaLabel}>PROFORMA INVOICE</Text>
            <Text style={styles.proformaSubLabel}>
              {isIndiaOffice
                ? "(Not a Tax Invoice — indicative GST shown below)"
                : "(Not a Tax Invoice — No GST applicable)"}
            </Text>
          </View>
        </View>

        {/* Parties */}
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
              {IAES.email} · {IAES.phone}
            </Text>
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyTitle}>Billed To</Text>
            {isIndiaOffice ? (
              <>
                <Text style={styles.partyName}>{billing!.legal_name}</Text>
                <Text style={styles.partyLine}>{billing!.billing_address}</Text>
                <Text style={styles.partyLine}>
                  {billing!.city}, {billing!.state} - {billing!.pin_code}
                </Text>
                <Text style={styles.partyLine}>PAN: {billing!.pan_number}</Text>
                <Text style={styles.partyLine}>
                  GSTIN: {billing!.gstin || "Unregistered"}
                </Text>
                <Text style={[styles.partyLine, { marginTop: 3 }]}>
                  Service rendered for: {registration.university_name} —{" "}
                  {fair.name}
                </Text>
              </>
            ) : attn ? (
              <>
                <Text style={styles.partyName}>
                  {registration.university_name}
                </Text>
                <Text style={styles.partyLine}>Attn: {attn.name}</Text>
                {attn.title && (
                  <Text style={styles.partyLine}>{attn.title}</Text>
                )}
                <Text style={styles.partyLine}>{attn.email}</Text>
                <Text style={styles.partyLine}>
                  {registration.university_country}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.partyName}>
                  {registration.university_name}
                </Text>
                <Text style={styles.partyLine}>{registration.contact_name}</Text>
                {registration.contact_title && (
                  <Text style={styles.partyLine}>
                    {registration.contact_title}
                  </Text>
                )}
                <Text style={styles.partyLine}>{registration.contact_email}</Text>
                <Text style={styles.partyLine}>
                  {registration.university_country}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Proforma Reference</Text>
            <Text style={styles.metaValue}>{ref}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{fmtDate(invoice.issued_at)}</Text>
          </View>
          {invoice.due_date && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Reservation Until</Text>
              <Text style={styles.metaValue}>{fmtDate(invoice.due_date)}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Payment Currency</Text>
            <Text style={styles.metaValue}>{invoice.payment_currency}</Text>
          </View>
        </View>

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.cellSac, styles.th]}>SAC</Text>
            <Text style={[styles.cellDesc, styles.th]}>Description</Text>
            <Text style={[styles.cellAmount, styles.th]}>Amount (USD)</Text>
          </View>
          {registration.pricing_tier === "PREMIUM" ? (
            <View style={styles.tableRow}>
              <Text style={styles.cellSac}>{IAES.sac}</Text>
              <Text style={styles.cellDesc}>
                Premium Booth — {fair.name}{"\n"}Includes: 2 Tables · 4
                Representatives · Branded Backdrop · Print Ad Placement ·
                Social Media Campaign · Vernacular Volunteer · Transport
                &amp; Meals
              </Text>
              <Text style={styles.cellAmount}>{fmtUSD(baseUSD)}</Text>
            </View>
          ) : (
            <>
              <View style={styles.tableRow}>
                <Text style={styles.cellSac}>{IAES.sac}</Text>
                <Text style={styles.cellDesc}>
                  Fair Registration — {tierLabel} (1 Counter · 2 Reps)
                </Text>
                <Text style={styles.cellAmount}>{fmtUSD(baseUSD)}</Text>
              </View>
              {addonTables > 0 && (
                <View style={styles.tableRow}>
                  <Text style={styles.cellSac}>{IAES.sac}</Text>
                  <Text style={styles.cellDesc}>
                    Additional Table × {addonTables}
                  </Text>
                  <Text style={styles.cellAmount}>
                    {fmtUSD(addonTables * extraTableUSD)}
                  </Text>
                </View>
              )}
              {addonReps > 0 && (
                <View style={styles.tableRow}>
                  <Text style={styles.cellSac}>{IAES.sac}</Text>
                  <Text style={styles.cellDesc}>
                    Additional Representative × {addonReps}
                  </Text>
                  <Text style={styles.cellAmount}>
                    {fmtUSD(addonReps * extraRepUSD)}
                  </Text>
                </View>
              )}
            </>
          )}
          <View style={styles.tableRowTotal}>
            <Text style={styles.cellSac}> </Text>
            <Text style={[styles.cellDesc, styles.totalText]}>
              TOTAL PAYABLE
            </Text>
            <Text style={[styles.cellAmount, styles.totalText]}>
              {fmtUSD(totalUSD)}
            </Text>
          </View>
        </View>

        {invoice.payment_currency === "INR" && indicativeINR > 0 && (
          <View
            style={{
              marginTop: 12,
              padding: 8,
              backgroundColor: "#F5F7FA",
              borderRadius: 4,
            }}
          >
            <Text style={{ fontSize: 9, color: "#3A5A94" }}>
              Indicative {gstEst ? "base " : ""}amount: {fmtINR(indicativeINR)}
              {invoice.forex_rate_used && invoice.forex_rate_date && (
                <>
                  {" "}(at 1 USD = ₹{Number(invoice.forex_rate_used).toFixed(2)}{" "}
                  on {fmtDate(invoice.forex_rate_date)}
                  {invoice.forex_rate_time
                    ? ` ${invoice.forex_rate_time} IST`
                    : ""}
                  {invoice.forex_rate_source
                    ? ` · ${invoice.forex_rate_source}`
                    : ""}
                  )
                </>
              )}
            </Text>
            {gstEst && gstEst.gstType === "IGST" && (
              <Text style={{ fontSize: 9, color: "#3A5A94", marginTop: 2 }}>
                + IGST @ {gstEst.igstPercent}%: {fmtINR(gstEst.igstAmount)}
              </Text>
            )}
            {gstEst && gstEst.gstType === "CGST_SGST" && (
              <Text style={{ fontSize: 9, color: "#3A5A94", marginTop: 2 }}>
                + CGST @ {gstEst.cgstPercent}%: {fmtINR(gstEst.cgstAmount)} ·
                SGST @ {gstEst.sgstPercent}%: {fmtINR(gstEst.sgstAmount)}
              </Text>
            )}
            {gstEst && (
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#0B2B5C",
                  marginTop: 3,
                }}
              >
                = Indicative total (incl. GST):{" "}
                {fmtINR(gstEst.totalAmountINR)}
              </Text>
            )}
            <Text style={{ fontSize: 9, color: "#3A5A94", marginTop: 3 }}>
              * Indicative only. Final INR amount and GST are locked at the
              live forex rate on the date of payment, determined per CGST
              Rule 34(2) (GAAP).
            </Text>
          </View>
        )}

        <ItineraryBlockPDF
          stops={itinerary}
          arriveBy={fair.arrive_by}
          departAfter={fair.depart_after}
        />

        <BankDetailsPDF />

        {/* Statutory disclaimer */}
        <Text style={styles.disclaimer}>
          This Proforma Invoice is issued as a courtesy prior to payment. It
          does not constitute a Tax Invoice under the Central Goods and
          Services Tax Act, 2017. A Tax Invoice bearing an official invoice
          number and applicable GST will be issued upon receipt of full
          payment.
        </Text>

        <Text style={styles.footer}>
          Booth: {Number(registration.total_tables || 1)} table
          {Number(registration.total_tables || 1) === 1 ? "" : "s"} ·{" "}
          {Number(registration.total_reps || 2)} representative
          {Number(registration.total_reps || 2) === 1 ? "" : "s"}
          {"\n"}Fair: {fair.name} · {fair.venue || fair.city}
          {"\n"}For queries: {IAES.email} · {IAES.phone}
        </Text>
      </Page>
    </Document>
  );
}
