import { formatUSD, formatDateShort } from "@/lib/utils";
import type { Registration, Invoice, Fair } from "@/types";
import { BankDetailsHTML } from "./BankDetailsHTML";
import { IAES_LOGO_PATH, IAES_LOGO_ALT } from "@/lib/brand";

interface Props {
  registration: Registration;
  invoice: Invoice;
  fair: Fair;
}

const IAES = {
  name: "Indo American Education Society",
  address: "3rd Floor, 301-302, Sun Square, Navarangpura, Ahmedabad - 380009",
  gstin: "24AAATI2674J1ZM",
  pan: "AAATI2674J",
  sac: "998596",
};

export function InvoiceUSD({ registration, invoice, fair }: Props) {
  const total = Number(invoice.total_amount_usd ?? invoice.base_amount_usd ?? 0);
  const addonCost = Number(registration.addon_cost_usd || 0);
  const baseUSD = Number(invoice.base_amount_usd ?? 0) - addonCost;
  const addonTables = Number(registration.addon_tables || 0);
  const addonReps = Number(registration.addon_reps || 0);
  const extraTableUSD = Number(fair.price_extra_table_usd ?? 300);
  const extraRepUSD = Number(fair.price_extra_rep_usd ?? 100);
  const tierLabel =
    registration.pricing_tier === "EARLYBIRD" ? "Early Bird" : "Standard";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-navy/10 pb-6">
        <div>
          <img
            src={IAES_LOGO_PATH}
            alt={IAES_LOGO_ALT}
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover"
          />
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gold-500">
            EducationUSA Fairs &middot; Gujarat
          </p>
        </div>
        <p className="font-serif text-2xl tracking-[0.18em] text-navy/70">
          INVOICE
        </p>
      </div>

      {/* Parties */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-navy/50">From</p>
          <p className="mt-2 font-medium text-navy">{IAES.name}</p>
          <p className="text-sm text-navy/70">{IAES.address}</p>
          <p className="text-sm text-navy/70">Gujarat, India</p>
          <p className="text-sm text-navy/70">
            GSTIN: {IAES.gstin} &middot; PAN: {IAES.pan}
          </p>
          <p className="text-sm text-navy/70">eduadviser@iaesgujarat.org</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-navy/50">
            Billed To
          </p>
          <p className="mt-2 font-medium text-navy">
            {registration.university_name}
          </p>
          <p className="text-sm text-navy/70">{registration.contact_name}</p>
          {registration.contact_title && (
            <p className="text-sm text-navy/70">{registration.contact_title}</p>
          )}
          <p className="text-sm text-navy/70">{registration.contact_email}</p>
          <p className="text-sm text-navy/70">{registration.university_country}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="grid gap-6 rounded-md bg-cream/70 p-4 sm:grid-cols-3">
        <Meta label="Invoice No." value={invoice.invoice_number || "—"} />
        <Meta label="Issued" value={formatDateShort(invoice.issued_at)} />
        {invoice.due_date && (
          <Meta label="Due" value={formatDateShort(invoice.due_date)} />
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
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-navy/10">
              <td className="px-4 py-3 align-top text-navy/70">{IAES.sac}</td>
              <td className="px-4 py-3">
                Fair Registration &mdash; {tierLabel}
                <div className="text-xs text-navy/55">
                  1 Counter · 2 Representatives ·{" "}
                  {formatDateShort(
                    (fair.fair_date_start || fair.fair_date) as string
                  )}
                  {fair.fair_date_end ? " onwards" : ""} · {fair.city}
                </div>
              </td>
              <td className="px-4 py-3 text-right">{formatUSD(baseUSD)}</td>
            </tr>

            {addonTables > 0 && (
              <tr className="border-b border-navy/10">
                <td className="px-4 py-3 align-top text-navy/70">{IAES.sac}</td>
                <td className="px-4 py-3">
                  Additional Table × {addonTables}
                  <div className="text-xs text-navy/55">
                    USD {extraTableUSD.toLocaleString()} per extra table
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {formatUSD(addonTables * extraTableUSD)}
                </td>
              </tr>
            )}

            {addonReps > 0 && (
              <tr className="border-b border-navy/10">
                <td className="px-4 py-3 align-top text-navy/70">{IAES.sac}</td>
                <td className="px-4 py-3">
                  Additional Representative × {addonReps}
                  <div className="text-xs text-navy/55">
                    USD {extraRepUSD.toLocaleString()} per extra rep
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {formatUSD(addonReps * extraRepUSD)}
                </td>
              </tr>
            )}

            <tr className="border-b border-navy/10 text-navy/70">
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-xs italic">
                GST: Not applicable (Export of service &mdash; zero rated)
              </td>
              <td className="px-4 py-3 text-right">&mdash;</td>
            </tr>

            <tr className="bg-cream/70 font-semibold text-navy">
              <td className="px-4 py-3" />
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3 text-right text-base">
                {formatUSD(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <BankDetailsHTML />

      <p className="text-xs text-navy/50">
        Payments accepted via Razorpay International (card). For international
        wire transfer, contact eduadviser@iaesgujarat.org.
      </p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-navy/50">{label}</p>
      <p className="mt-1 font-semibold text-navy">{value}</p>
    </div>
  );
}
