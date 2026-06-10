# IAES Fairs — GST & Forex Audit Documentation

> Audit-defense reference for accountants, GST auditors and assessing officers.
> Describes how invoices are numbered, how tax is computed, and how foreign
> exchange rates are sourced and locked. Maintained alongside the billing code;
> last updated 2026-06-10.

## 1. Entity & supply

| Item | Value |
| --- | --- |
| Supplier | IAES (International Academic Exchange Services) |
| GSTIN | 24AAATI2674J1ZM |
| State code | 24 (Gujarat) |
| Service classification | SAC **998596** — events, exhibitions, conventions and trade-show organisation services |
| Nature of supply | Participation fee for university recruitment fairs held in India |

Two customer populations, two tax treatments:

1. **Foreign university pays directly (USD)** — export of service, **zero-rated**
   under GST. No GST charged. Reported in **GSTR-1 Table 6A**.
2. **Indian entity pays (INR)** — taxable domestic supply at **18% GST**.
   Reported in **GSTR-1 Table 4/7** (B2B/B2C as applicable).

## 2. Invoice numbering (CGST Rule 46)

Two parallel, independently sequential series, permitted under Rule 46
(multiple series allowed if each is internally sequential):

| Series | Format | Used for |
| --- | --- | --- |
| DOMESTIC | `IAES-FAIR-<FY>-<nnn>` | INR (taxable) invoices |
| EXPORT | `IAES-FAIR-<FY>-EXP-<nnn>` | USD (zero-rated export) invoices |

- `<FY>` is the Indian financial year, e.g. `2627` = FY 2026-27. **Both series
  reset to 001 on April 1.**
- Numbers are minted atomically by a database function
  (`generate_invoice_number`, backed by the `invoice_sequences` table) at
  **TAX-invoice generation time only**. The series is selected from the
  invoice's payment currency (INR → DOMESTIC, USD → EXPORT).
- **Proforma invoices never consume a tax-invoice number** (they carry their
  own `PI-` reference). Gaps cannot arise from proformas.
- Current counters per FY are visible to admins at `/admin/sequences`.

## 3. Forex methodology (USD-priced fairs invoiced in INR)

### Legal basis

IAES supplies a **service**, so CGST **Rule 34(2)** applies: the exchange rate
is the rate determined **per GAAP at the time of supply**. (Rule 34(1) — the
RBI/Customs-notified rate — applies to *goods* and is not the operative rule
here.) A consistent, dated market reference rate locked at the time of supply
is therefore compliant and defensible.

### Implementation

- Source: live USD→INR market reference rate (exchangerate-api.com), fetched
  at invoice generation (`lib/forex.ts`).
- The rate is **locked onto the invoice row** at generation and never
  recomputed. Four provenance fields are stored and printed on every INR
  document (migration `0020_forex_provenance.sql`):
  - `forex_rate_used` (4-decimal precision)
  - `forex_rate_date`
  - `forex_rate_source`
  - `forex_rate_time` (IST)
- INR invoices and proformas display the legend: rate, source, IST timestamp,
  and *"per CGST Rule 34(2) (GAAP, export of service), locked at invoice
  generation, immutable."*
- If the live source is unreachable, a fallback rate (₹83.50) is used and the
  stored `forex_rate_source` explicitly says **"System fallback rate (live
  source unavailable)"** — fallback use is never silent.
- USD (export) invoices carry **no forex exposure**: they are issued and
  settled in USD, zero-rated.

### Planned upgrade (optional, not a defect)

Migrating the reference source to the RBI/FBIL reference rate ("Track 2") is
tracked as a best-practice upgrade. It is **not** required for compliance
under Rule 34(2) and has deliberately not been rushed: FBIL has no stable
public JSON API and publishes only ~1:30 PM IST on RBI working days, so a
naive integration would risk breaking live billing.

## 4. Manual (offline) payment confirmation — reverse-GST model

Until/alongside the payment gateway, payments arrive by bank transfer. The
invoice is tied to the **amount actually received**, entered by the admin:

- **USD receipt:** admin enters the USD amount → USD tax invoice, no GST.
- **INR receipt:** admin enters the **GST-inclusive total**; the system backs
  the tax out: `GST = total × 18 / 118`, `basic = total − GST`, split as
  IGST 18% or CGST 9% + SGST 9% per the customer's state.
  Example: ₹1,18,000 received → basic ₹1,00,000 + GST ₹18,000.
- The implied forex rate (`basic INR ÷ base USD`) is recorded so the invoice
  reconciles internally.

Each manual confirmation also captures, in the `payments` table, for books
reconciliation and the Finance MIS: bank credit date, reference number/UTR,
**amount actually credited in INR** (may differ from billed due to bank/forex
charges), payment method, remitter and recording admin. The billed amount and
the realised amount are deliberately stored as separate figures.

## 5. Third-party billing (Mode B)

When an Indian office (e.g. a university's India representative such as
Sannam S4 India Pvt Ltd) is the paying customer:

- The Indian entity is the **customer of record** on the INR invoice
  (its legal name, GSTIN and state drive the IGST/CGST+SGST split).
- An `authorization_note` records *why* a third party is being billed.
- Every such INR document carries a **"Service rendered for: [university] —
  [fair]"** line preserving the audit link between payer and beneficiary.
- Under the current business rule, direct university payment is always USD;
  INR billing always means an India-office payer.

When a foreign university merely wants the document *addressed* to a specific
person (Mode A), the legal customer **stays the university**; only an
"Attn: name/title/email" line is added. Attention lines never change the
customer of record.

## 6. Export documentation

- A signed **W-8BEN-E** is automatically attached to every USD proforma,
  tax invoice and confirmation email (source: `docs/`, gated download at
  `/api/invoice/<id>/w8`, USD registrations only).

## 7. Records an auditor can request

| Record | Where |
| --- | --- |
| Tax invoices & proformas (immutable snapshots incl. forex provenance) | `invoices` table; PDF attached to every customer email (Resend log = proof of delivery) |
| Invoice number counters per FY/series | `invoice_sequences` table / `/admin/sequences` |
| Payment receipts incl. UTR, bank-credit date, realised INR | `payments` table |
| Third-party billing authorisations | `billing_details.authorization_note` |
| Registration & status history | `registrations`, `fair_status_log` |

All monetary records are written through server-side code paths only (RLS
denies direct client access); invoice rows are never edited after minting —
corrections are made by voiding and re-issuing.
