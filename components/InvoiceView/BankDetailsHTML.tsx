import { IAES_BANK_INR_ROWS, IAES_BANK_USD_ROWS } from "@/lib/iaesBank";

function BankCol({
  title,
  rows,
}: {
  title: string;
  rows: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <div className="rounded-md border border-navy/10 overflow-hidden">
      <p className="bg-gold/15 px-3 py-2 text-xs font-semibold text-navy">
        {title}
      </p>
      <dl className="divide-y divide-navy/5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 px-3 py-1.5">
            <dt className="w-40 shrink-0 text-xs text-navy/55">{label}</dt>
            <dd className="text-xs font-medium text-navy">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function BankDetailsHTML() {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy/60">
        IAES Bank Details
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <BankCol
          title="Center's Bank Details for Local Currency (INR) Payment"
          rows={IAES_BANK_INR_ROWS}
        />
        <BankCol
          title="Correspondent bank detail for USD currency"
          rows={IAES_BANK_USD_ROWS}
        />
      </div>
    </div>
  );
}
