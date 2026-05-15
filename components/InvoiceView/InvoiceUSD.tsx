import { formatUSD, formatDateShort } from "@/lib/utils";
import type { Registration, Invoice, Fair } from "@/types";

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
        <Meta label="Invoice No." value={invoice.invoice_number} />
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
                Fair Booth &mdash; {registration.booth_type}
                <span className="ml-2 text-xs text-navy/50">({fair.name})</span>
              </td>
              <td className="px-4 py-3 text-right">
                {formatUSD(Number(invoice.base_amount_usd))}
              </td>
            </tr>
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
                {formatUSD(Number(invoice.total_amount_usd))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
