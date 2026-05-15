# IAES Fairs — Claude Code Prompt v7 (ADDENDUM TO V2–V6)
# Add AFTER v6 is complete.
# Do NOT rebuild anything from v1–v6.
# This addendum adds: Booth Configuration (Tables + Reps add-ons),
# live price calculator, invoice line items, T&C update.

---

## BUSINESS RULES (hardcoded — do not deviate)

```
Default included:     1 table, 2 reps
Extra table:          USD 300 per table
Extra rep:            USD 100 per rep
Max tables:           3 (hard limit)
Max reps:             total_tables × 2 (hard limit from T&C)
Reps always even?:    No — e.g. 2 tables + 3 reps is valid
```

---

## 1. DATABASE CHANGES

### 1A. Update `registrations` Table

```sql
ALTER TABLE registrations
  ADD COLUMN total_tables INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN total_reps INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN addon_tables INTEGER NOT NULL DEFAULT 0,  -- tables beyond 1 default
  ADD COLUMN addon_reps INTEGER NOT NULL DEFAULT 0,    -- reps beyond 2 default
  ADD COLUMN addon_cost_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00;
```

### 1B. Update `fairs` Table — Add Add-on Pricing

```sql
ALTER TABLE fairs
  ADD COLUMN price_extra_table_usd NUMERIC(10,2) NOT NULL DEFAULT 300.00,
  ADD COLUMN price_extra_rep_usd NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  ADD COLUMN max_tables_per_university INTEGER NOT NULL DEFAULT 3;
```

Update the seeded fair:
```sql
UPDATE fairs SET
  price_extra_table_usd = 300.00,
  price_extra_rep_usd = 100.00,
  max_tables_per_university = 3;
```

---

## 2. NEW HELPER: `lib/booth.ts`

All booth pricing logic lives here. Pure functions. No side effects.

```typescript
// lib/booth.ts

export const BOOTH_DEFAULTS = {
  tables: 1,
  reps: 2,
} as const;

export interface BoothConfig {
  totalTables: number;
  totalReps: number;
}

export interface BoothPricing {
  basePriceUSD: number;           // from fair (standard or early bird)
  addonTables: number;            // extra tables beyond default 1
  addonReps: number;              // extra reps beyond default 2
  addonTablesCostUSD: number;     // addonTables × price_extra_table_usd
  addonRepsCostUSD: number;       // addonReps × price_extra_rep_usd
  addonTotalCostUSD: number;      // addonTablesCostUSD + addonRepsCostUSD
  grandTotalUSD: number;          // basePriceUSD + addonTotalCostUSD
}

export function calculateBoothPricing(
  config: BoothConfig,
  basePriceUSD: number,
  priceExtraTableUSD: number = 300,
  priceExtraRepUSD: number = 100,
): BoothPricing {
  const addonTables = Math.max(0, config.totalTables - BOOTH_DEFAULTS.tables);
  const addonReps = Math.max(0, config.totalReps - BOOTH_DEFAULTS.reps);

  const addonTablesCostUSD = addonTables * priceExtraTableUSD;
  const addonRepsCostUSD = addonReps * priceExtraRepUSD;
  const addonTotalCostUSD = addonTablesCostUSD + addonRepsCostUSD;

  return {
    basePriceUSD,
    addonTables,
    addonReps,
    addonTablesCostUSD,
    addonRepsCostUSD,
    addonTotalCostUSD,
    grandTotalUSD: basePriceUSD + addonTotalCostUSD,
  };
}

export function getMaxReps(totalTables: number): number {
  return totalTables * 2;         // T&C: 2 reps per table maximum
}

export function validateBoothConfig(
  config: BoothConfig,
  maxTables: number = 3,
): { valid: boolean; error?: string } {
  if (config.totalTables < 1 || config.totalTables > maxTables) {
    return {
      valid: false,
      error: `Tables must be between 1 and ${maxTables}.`,
    };
  }
  const maxReps = getMaxReps(config.totalTables);
  if (config.totalReps < 1 || config.totalReps > maxReps) {
    return {
      valid: false,
      error: `With ${config.totalTables} table(s), maximum reps allowed is ${maxReps} (2 per table).`,
    };
  }
  return { valid: true };
}
```

---

## 3. NEW COMPONENT: `BoothConfigurator`

```typescript
// components/RegistrationForm/BoothConfigurator.tsx
"use client";

import { useState, useEffect } from "react";
import { calculateBoothPricing, getMaxReps } from "@/lib/booth";

interface Props {
  basePriceUSD: number;
  priceExtraTableUSD: number;    // from fair record (300)
  priceExtraRepUSD: number;      // from fair record (100)
  maxTables: number;             // from fair record (3)
  onChange: (config: {
    totalTables: number;
    totalReps: number;
    addonCostUSD: number;
    grandTotalUSD: number;
  }) => void;
}

export function BoothConfigurator({
  basePriceUSD,
  priceExtraTableUSD,
  priceExtraRepUSD,
  maxTables,
  onChange,
}: Props) {
  const [tables, setTables] = useState(1);
  const [reps, setReps] = useState(2);

  const maxReps = getMaxReps(tables);
  const pricing = calculateBoothPricing(
    { totalTables: tables, totalReps: reps },
    basePriceUSD,
    priceExtraTableUSD,
    priceExtraRepUSD,
  );

  // When tables decrease, clamp reps to new max
  useEffect(() => {
    if (reps > maxReps) setReps(maxReps);
  }, [tables, maxReps, reps]);

  useEffect(() => {
    onChange({
      totalTables: tables,
      totalReps: reps,
      addonCostUSD: pricing.addonTotalCostUSD,
      grandTotalUSD: pricing.grandTotalUSD,
    });
  }, [tables, reps]);

  return (
    <div className="rounded-xl border border-navy/10 bg-[#F5F7FA] p-6 space-y-6">
      <h3 className="font-serif text-lg font-semibold text-navy">
        Booth Configuration
      </h3>

      {/* Tables stepper */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-navy">
              Counter / Table
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              1 included · +USD {priceExtraTableUSD} per extra table
            </p>
          </div>
          <Stepper
            value={tables}
            min={1}
            max={maxTables}
            onChange={setTables}
          />
        </div>
        {tables > 1 && (
          <p className="mt-1.5 text-xs text-gold font-medium">
            +{tables - 1} extra table{tables - 1 > 1 ? "s" : ""} ·
            USD {(tables - 1) * priceExtraTableUSD} added
          </p>
        )}
      </div>

      {/* Reps stepper */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-navy">
              Representatives
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              2 included · +USD {priceExtraRepUSD} per extra rep ·
              Max {maxReps} with {tables} table{tables > 1 ? "s" : ""}
            </p>
          </div>
          <Stepper
            value={reps}
            min={2}
            max={maxReps}
            onChange={setReps}
          />
        </div>
        {reps > 2 && (
          <p className="mt-1.5 text-xs text-gold font-medium">
            +{reps - 2} extra rep{reps - 2 > 1 ? "s" : ""} ·
            USD {(reps - 2) * priceExtraRepUSD} added
          </p>
        )}
      </div>

      {/* Live price summary */}
      <div className="rounded-lg border border-navy/10 bg-white p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy">
          Price Summary
        </p>

        {/* Base */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            Fair Registration (1 table · 2 reps)
          </span>
          <span className="font-medium text-navy">
            USD {basePriceUSD.toLocaleString()}
          </span>
        </div>

        {/* Extra tables */}
        {pricing.addonTables > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Extra Table × {pricing.addonTables}
            </span>
            <span className="font-medium text-navy">
              + USD {pricing.addonTablesCostUSD}
            </span>
          </div>
        )}

        {/* Extra reps */}
        {pricing.addonReps > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Extra Representative × {pricing.addonReps}
            </span>
            <span className="font-medium text-navy">
              + USD {pricing.addonRepsCostUSD}
            </span>
          </div>
        )}

        {/* Divider + total */}
        <div className="border-t border-navy/10 pt-2 flex justify-between">
          <span className="text-sm font-semibold text-navy">
            Total (USD)
          </span>
          <span className="text-lg font-bold text-navy">
            USD {pricing.grandTotalUSD.toLocaleString()}
          </span>
        </div>

        {/* GST note */}
        <p className="text-xs text-gray-400">
          * If paying in INR, GST (18%) will be added on the invoice.
        </p>
      </div>
    </div>
  );
}

// ── Stepper sub-component ─────────────────────────────────────────────────────

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="h-8 w-8 rounded-full border border-navy/20 text-navy font-bold
                   disabled:opacity-30 hover:bg-navy hover:text-white transition-colors"
      >
        −
      </button>
      <span className="w-6 text-center font-semibold text-navy">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="h-8 w-8 rounded-full border border-navy/20 text-navy font-bold
                   disabled:opacity-30 hover:bg-navy hover:text-white transition-colors"
      >
        +
      </button>
    </div>
  );
}
```

---

## 4. UPDATE: Registration Form Step 1

Add `BoothConfigurator` to `Step1University.tsx`, below the Booth Type radio buttons.

```typescript
// In Step1University.tsx

// Add state:
const [boothConfig, setBoothConfig] = useState({
  totalTables: 1,
  totalReps: 2,
  addonCostUSD: 0,
  grandTotalUSD: fair.price_standard_usd, // or early bird
});

// Add component after existing booth type selector:
<BoothConfigurator
  basePriceUSD={activePriceUSD}        // early bird or standard
  priceExtraTableUSD={fair.price_extra_table_usd}
  priceExtraRepUSD={fair.price_extra_rep_usd}
  maxTables={fair.max_tables_per_university}
  onChange={setBoothConfig}
/>

// Pass boothConfig up to parent form via react-hook-form setValue:
useEffect(() => {
  setValue("total_tables", boothConfig.totalTables);
  setValue("total_reps", boothConfig.totalReps);
  setValue("addon_cost_usd", boothConfig.addonCostUSD);
  setValue("grand_total_usd", boothConfig.grandTotalUSD);
}, [boothConfig]);
```

---

## 5. UPDATE: `/api/register` Route

```typescript
// In app/api/register/route.ts

// 1. Extract booth config from body:
const {
  total_tables = 1,
  total_reps = 2,
  // ... other fields
} = body;

// 2. Server-side validation:
const { valid, error } = validateBoothConfig(
  { totalTables: total_tables, totalReps: total_reps },
  fair.max_tables_per_university,
);
if (!valid) {
  return NextResponse.json({ error }, { status: 400 });
}

// 3. Calculate pricing server-side (never trust client):
const pricing = calculateBoothPricing(
  { totalTables: total_tables, totalReps: total_reps },
  activePriceUSD,                           // early bird or standard
  fair.price_extra_table_usd,
  fair.price_extra_rep_usd,
);

// 4. Insert registration with booth fields:
await supabase.from("registrations").insert({
  // ... existing fields ...
  total_tables,
  total_reps,
  addon_tables: pricing.addonTables,
  addon_reps: pricing.addonReps,
  addon_cost_usd: pricing.addonTotalCostUSD,
  // Grand total goes into invoice, not registration
});

// 5. Pass grand total to invoice creation:
// invoice.base_amount_usd = pricing.grandTotalUSD
```

---

## 6. UPDATE: Invoice — Add Line Items

Both `InvoiceUSD.tsx` and `InvoiceINR.tsx` must show itemised pricing.

### Invoice Line Items (USD Invoice)

```
┌──────────────────────────────────────────────────────┐
│ SAC     Description                      Amount (USD) │
│ ─────────────────────────────────────────────────── │
│ 998596  Fair Registration — Standard         1,700   │
│         (1 Counter · 2 Representatives               │
│          · 6–8 Aug 2026 · Ahmedabad)                 │
│                                                      │
│ 998596  Additional Table × 1                   300   │
│                                                      │
│ 998596  Additional Representative × 2          200   │
│                                                      │
│         ─────────────────────────────────────────   │
│         TOTAL                                2,200   │
└──────────────────────────────────────────────────────┘
```

Show add-on lines ONLY if `addon_tables > 0` or `addon_reps > 0`.
If both are 0 → show only the base registration line.

### Invoice Line Items (INR Invoice with GST)

```
┌────────────────────────────────────────────────────────────┐
│ SAC    Description                  Rate (USD)  Amount (₹) │
│ ───────────────────────────────────────────────────────── │
│ 998596 Fair Registration — Standard  USD 1,700  ₹1,61,500 │
│        (1 Counter · 2 Reps)                               │
│                                                           │
│ 998596 Additional Table × 1          USD   300  ₹  28,500 │
│                                                           │
│ 998596 Additional Rep × 2            USD   200  ₹  19,000 │
│                                                           │
│        ────────────────────────────────────────────────   │
│        Subtotal                       USD 2,200  ₹2,09,000│
│        CGST @ 9%                                ₹ 18,810  │
│        SGST @ 9%                                ₹ 18,810  │
│        ────────────────────────────────────────────────   │
│        TOTAL                                   ₹2,46,620  │
└────────────────────────────────────────────────────────────┘
```

INR amounts = USD amount × forex_rate_used (locked at invoice time).

### PDF Invoice Data Structure

Pass this to both invoice components:

```typescript
interface InvoiceLineItem {
  sacCode: string;       // always "998596"
  description: string;
  quantityUSD: number;
  amountINR?: number;    // INR invoice only
}

const lineItems: InvoiceLineItem[] = [
  {
    sacCode: "998596",
    description: `Fair Registration — ${pricingTier === 'EARLYBIRD' ? 'Early Bird' : 'Standard'}\n(1 Counter · 2 Representatives · ${fairDates} · ${fairCity})`,
    quantityUSD: basePriceUSD,
    amountINR: basePriceUSD * forexRate,
  },
  // Conditionally add:
  ...(addonTables > 0 ? [{
    sacCode: "998596",
    description: `Additional Table × ${addonTables}`,
    quantityUSD: addonTablesCostUSD,
    amountINR: addonTablesCostUSD * forexRate,
  }] : []),
  ...(addonReps > 0 ? [{
    sacCode: "998596",
    description: `Additional Representative × ${addonReps}`,
    quantityUSD: addonRepsCostUSD,
    amountINR: addonRepsCostUSD * forexRate,
  }] : []),
];
```

---

## 7. UPDATE: T&C — Clauses 2.3 and 2.4

In `app/terms/page.tsx` update these two clauses:

### Clause 2.3 (updated)
```
2.3 Each registration includes one (1) counter/table space and a maximum
of two (2) University Representatives as the default allocation.

Additional representatives may be added during registration at a fee of
USD 100 per representative. The maximum number of representatives permitted
is two (2) per table booked (e.g. 2 tables = maximum 4 representatives).
```

### Clause 2.4 (updated — replaces old $2,000 flat rate)
```
2.4 Universities requiring additional counter/table space may book up to
a maximum of three (3) tables in total. Each additional table beyond the
default is charged at USD 300 per table.

Add-on fees (extra tables and extra representatives) are added to the base
registration fee and appear as separate line items on the invoice.
All add-on fees are subject to the same GST rules and cancellation policy
as the base registration fee.
```

Also update the registration checkbox summary in `Step2Contact.tsx`:
```
Replace:
"Maximum 2 representatives per counter space."
"Second table charged at USD 2,000 extra."

With:
"Default: 1 table and 2 representatives included in base fee."
"Extra table: USD 300 each (max 3 tables total)."
"Extra representative: USD 100 each (max 2 reps per table)."
```

---

## 8. UPDATE: Admin Dashboard

In the University Registrations table, update columns:

```
Old:  | Booth | Amount |
New:  | Tables | Reps | Base (USD) | Add-ons (USD) | Total (USD) | Status |
```

Example row:
```
Arizona State | 2 tables | 4 reps | $1,700 | +$500 | $2,200 | ✅ Confirmed
```

In the Fair Control Panel (`/admin/fairs/[fairId]`), update the stats section:
```
Revenue breakdown:
  Base registrations:  18 × $1,700 = $30,600
  Table add-ons:       6 extra tables = $1,800
  Rep add-ons:         9 extra reps = $900
  ──────────────────────────────────────────
  Total USD Revenue:   $33,300
```

---

## 9. UPDATE: Types — `types/index.ts`

```typescript
// Update Registration interface:
export interface Registration {
  // ... existing fields ...
  total_tables: number;
  total_reps: number;
  addon_tables: number;
  addon_reps: number;
  addon_cost_usd: number;
}

// Update Fair interface:
export interface Fair {
  // ... existing fields ...
  price_extra_table_usd: number;
  price_extra_rep_usd: number;
  max_tables_per_university: number;
}

// New:
export interface BoothPricing {
  basePriceUSD: number;
  addonTables: number;
  addonReps: number;
  addonTablesCostUSD: number;
  addonRepsCostUSD: number;
  addonTotalCostUSD: number;
  grandTotalUSD: number;
}
```

---

## BUILD ORDER FOR V7 (run after v6 is complete)

1.  SQL: `ALTER TABLE registrations` — add booth columns
2.  SQL: `ALTER TABLE fairs` — add add-on pricing columns
3.  SQL: Update seeded fair with add-on prices
4.  Create `lib/booth.ts` — all booth pricing logic
5.  Update `types/index.ts` — Registration, Fair, BoothPricing
6.  Create `components/RegistrationForm/BoothConfigurator.tsx`
7.  Update `components/RegistrationForm/Step1University.tsx` — add configurator
8.  Update `app/api/register/route.ts` — server-side booth validation + pricing
9.  Update `components/InvoiceView/InvoiceUSD.tsx` — itemised line items
10. Update `components/InvoiceView/InvoiceINR.tsx` — itemised line items + GST per line
11. Update `app/terms/page.tsx` — clauses 2.3 and 2.4
12. Update checkbox summary in `Step2Contact.tsx`
13. Update `app/admin/dashboard/page.tsx` — booth columns + revenue breakdown
14. Update `app/admin/fairs/[fairId]/page.tsx` — revenue breakdown by type

---

## CRITICAL RULES FOR V7

- Pricing is ALWAYS calculated server-side in `/api/register` — never trust client total
- `validateBoothConfig()` must run server-side before any DB insert
- Max reps = total_tables × 2 — enforced both in UI (Stepper max prop) and server
- Max tables = `fair.max_tables_per_university` (default 3) — not hardcoded
- When tables decrease in the configurator, reps auto-clamp to new max (useEffect)
- Add-on lines appear on invoice ONLY if quantity > 0
- Early bird price applies to base fee only — add-ons are always at full rate
- GST on INR invoices applies to the FULL grand total (base + add-ons combined)
- T&C clauses 2.3 and 2.4 must reflect new pricing — remove old $2,000 flat rate
- Do NOT rebuild anything from v1–v6
