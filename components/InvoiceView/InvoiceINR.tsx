import { formatINR, formatDateShort } from "@/lib/utils";
import { rupeesToWords } from "@/lib/invoice";
import type { Registration, Invoice, Fair, BillingDetails } from "@/types";
import { BankDetailsHTML } from "./BankDetailsHTML";

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
};

export function InvoiceINR({ registration, invoice, fair, billing }: Props) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-navy/10 pb-6">
        <div>
          <p className="font-serif text-2xl font-semibold text-navy">IAES</p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-gold-500">
            EducationUSA Fairs &middot; Gujarat
          </p>
        </div>
        <p className="font-serif text-2xl tracking-[0.18em] text-navy/70">
          TAX INVOICE
        </p>
      </div>

      {/* From / Bill To */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-navy/50">From</p>
          <p className="mt-2 font-medium text-navy">{IAES.name}</p>
          <p className="text-sm text-navy/70">{IAES.addressL1}</p>
          <p className="text-sm text-navy/70">{IAES.addressL2}</p>
          <p className="text-sm text-navy/70">
            GSTIN: {IAES.gstin} &middot; PAN: {IAES.pan}
          </p>
          <p className="text-sm text-navy/70">
            State Code: {IAES.stateCode} &middot; SAC: {IAES.sac}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-navy/50">
            Billed To
          </p>
          {billing ? (
            <>
              <p className="mt-2 font-medium text-navy">{billing.legal_name}</p>
              <p className="text-sm text-navy/70">{billing.billing_address}</p>
              <p className="text-sm text-navy/70">
                {billing.city}, {billing.state} - {billing.pin_code}
              </p>
              <p className="text-sm text-navy/70">
                PAN: {billing.pan_number}
              </p>
              <p className="text-sm text-navy/70">
                GSTIN: {billing.gstin || "Unregistered"}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 font-medium text-navy">
                {registration.university_name}
              </p>
              <p className="text-sm text-navy/70">{registration.contact_name}</p>
              <p className="text-sm text-navy/70">{registration.contact_email}</p>
            </>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="grid gap-6 rounded-md bg-cream/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Invoice No." value={invoice.invoice_number || "—"} />
        <Meta label="Issued" value={formatDateShort(invoice.issued_at)} />
        {invoice.due_date && (
          <Meta label="Due" value={formatDateShort(invoice.due_date)} />
        )}
        {invoice.forex_rate_used && invoice.forex_rate_date && (
          <Meta
            label="Forex Rate"
            value={`1 USD = ₹${Number(invoice.forex_rate_used).toFixed(2)}`}
            sub={`as on ${formatDateShort(invoice.forex_rate_date)}`}
          />
        )}
      </div>

      {/* Line items */}
      <div className="overflow-hidden rounded-md border border-navy/10">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                SAC
              </th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                Rate
              </th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                Amount (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const addonCostUSD = Number(registration.addon_cost_usd || 0);
              const baseUSD =
                Number(invoice.base_amount_usd ?? 0) - addonCostUSD;
              const addonTables = Number(registration.addon_tables || 0);
              const addonReps = Number(registration.addon_reps || 0);
              const extraTableUSD = Number(fair.price_extra_table_usd ?? 300);
              const extraRepUSD = Number(fair.price_extra_rep_usd ?? 100);
              const rate = Number(invoice.forex_rate_used || 0);
              const tierLabel =
                registration.pricing_tier === "EARLYBIRD"
                  ? "Early Bird"
                  : "Standard";
              return (
                <>
                  <tr className="border-b border-navy/10">
                    <td className="px-4 py-3 align-top text-navy/70">
                      {IAES.sac}
                    </td>
                    <td className="px-4 py-3">
                      Fair Registration &mdash; {tierLabel}
                      <div className="text-xs text-navy/55">
                        1 Counter · 2 Representatives · {fair.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-navy/70">
                      USD {baseUSD.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatINR(baseUSD * rate)}
                    </td>
                  </tr>

                  {addonTables > 0 && (
                    <tr className="border-b border-navy/10">
                      <td className="px-4 py-3 align-top text-navy/70">
                        {IAES.sac}
                      </td>
                      <td className="px-4 py-3">
                        Additional Table × {addonTables}
                      </td>
                      <td className="px-4 py-3 text-right text-navy/70">
                        USD {(addonTables * extraTableUSD).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatINR(addonTables * extraTableUSD * rate)}
                      </td>
                    </tr>
                  )}

                  {addonReps > 0 && (
                    <tr className="border-b border-navy/10">
                      <td className="px-4 py-3 align-top text-navy/70">
                        {IAES.sac}
                      </td>
                      <td className="px-4 py-3">
                        Additional Representative × {addonReps}
                      </td>
                      <td className="px-4 py-3 text-right text-navy/70">
                        USD {(addonReps * extraRepUSD).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatINR(addonReps * extraRepUSD * rate)}
                      </td>
                    </tr>
                  )}

                  {(addonTables > 0 || addonReps > 0) && (
                    <tr className="border-b border-navy/10 text-navy/70">
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" colSpan={2}>
                        Subtotal
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatINR(Number(invoice.base_amount_inr || 0))}
                      </td>
                    </tr>
                  )}
                </>
              );
            })()}

            {invoice.gst_type === "CGST_SGST" && (
              <>
                <tr className="border-b border-navy/10 text-navy/70">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" colSpan={2}>
                    CGST @ {Number(invoice.cgst_percent)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatINR(Number(invoice.cgst_amount))}
                  </td>
                </tr>
                <tr className="border-b border-navy/10 text-navy/70">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" colSpan={2}>
                    SGST @ {Number(invoice.sgst_percent)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatINR(Number(invoice.sgst_amount))}
                  </td>
                </tr>
              </>
            )}

            {invoice.gst_type === "IGST" && (
              <tr className="border-b border-navy/10 text-navy/70">
                <td className="px-4 py-3" />
                <td className="px-4 py-3" colSpan={2}>
                  IGST @ {Number(invoice.igst_percent)}%
                </td>
                <td className="px-4 py-3 text-right">
                  {formatINR(Number(invoice.igst_amount))}
                </td>
              </tr>
            )}

            <tr className="bg-cream/70 font-semibold text-navy">
              <td className="px-4 py-3" />
              <td className="px-4 py-3" colSpan={2}>Total</td>
              <td className="px-4 py-3 text-right text-base">
                {formatINR(Number(invoice.total_amount_inr || 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm italic text-navy/70">
        Amount in words: {rupeesToWords(Number(invoice.total_amount_inr || 0))}
      </p>

      <BankDetailsHTML />

      <p className="text-xs text-navy/50">
        Payments accepted via Razorpay (card / UPI / netbanking). For wire
        transfer, contact eduadviser@iaesgujarat.org.
      </p>
    </div>
  );
}

function Meta({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-navy/50">{label}</p>
      <p className="mt-1 font-semibold text-navy">{value}</p>
      {sub && <p className="text-[10px] text-navy/50">{sub}</p>}
    </div>
  );
}
