# IAES Fairs — Claude Code Prompt v8 (ADDENDUM TO V2–V7)
# Add AFTER v7 is complete.
# Do NOT rebuild anything from v1–v7.
# This addendum adds: Proforma Invoice, Deferred Payment Gateway,
# Two-phase registration flow, Admin gateway toggle.

---

## CORE CONCEPT

Registration is ALWAYS open regardless of payment gateway status.
Payment is collected ONLY when the gateway is active.
GST is calculated and charged ONLY on the final Tax Invoice (post-payment).
Proforma Invoice is a commitment document — not a GST document.

---

## 1. DATABASE CHANGES

### 1A. Update `fairs` Table — Add Gateway Toggle

```sql
ALTER TABLE fairs
  ADD COLUMN payment_gateway_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN gateway_activated_at TIMESTAMPTZ,
  ADD COLUMN gateway_activation_note TEXT;
  -- e.g. "Razorpay account verified — 25 May 2026"
```

Update seeded fair (gateway off for now):
```sql
UPDATE fairs
SET payment_gateway_active = false
WHERE name = 'IAES U.S. University Education Fair — August 2026';
```

### 1B. Update `registrations` Table — New Status Values

```sql
-- Drop old status constraint and add new one
ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_status_check
  CHECK (status IN (
    'registered',        -- NEW: registered, gateway not yet active
    'payment_open',      -- NEW: gateway activated, payment link sent, awaiting payment
    'pending',           -- kept for backward compatibility
    'invoice_sent',      -- kept for backward compatibility
    'paid',              -- payment received, tax invoice generated
    'confirmed',         -- admin confirmed
    'cancelled'
  ));

-- Set default to 'registered' (was 'pending')
ALTER TABLE registrations
  ALTER COLUMN status SET DEFAULT 'registered';
```

### 1C. Update `invoices` Table — Add Invoice Type

```sql
ALTER TABLE invoices
  ADD COLUMN invoice_type TEXT NOT NULL DEFAULT 'TAX'
    CHECK (invoice_type IN ('PROFORMA', 'TAX')),
  ADD COLUMN proforma_reference TEXT UNIQUE;
  -- e.g. PI-2026-8F3K — short readable ref for proforma only
  -- TAX invoices use invoice_number (IAES-FAIR-2026-001)
  -- PROFORMA invoices use proforma_reference, invoice_number stays NULL
```

---

## 2. PROFORMA REFERENCE GENERATOR

```typescript
// lib/invoice.ts — add this function

export function generateProformaReference(): string {
  // Format: PI-2026-XXXX (random 4-char alphanumeric — not sequential)
  // Not sequential because proformas are NOT official records
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusable chars
  const rand = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `PI-${year}-${rand}`;
}

// IMPORTANT: invoice_number (IAES-FAIR-2026-001) is generated
// ONLY for TAX invoices, ONLY at payment time.
// Proforma invoices NEVER consume the invoice_counter sequence.
```

---

## 3. UPDATE: `/api/register` Route — Two Paths

```typescript
// app/api/register/route.ts

// After validating all fields and booth config:

// 1. Fetch fair to check gateway status
const { data: fair } = await supabase
  .from('fairs')
  .select('*, payment_gateway_active, ...')
  .eq('id', body.fair_id)
  .single();

// 2. Insert registration — status depends on gateway
const registrationStatus = fair.payment_gateway_active
  ? 'payment_open'    // gateway live — go straight to payment flow
  : 'registered';     // gateway not ready — register only

await supabase.from('registrations').insert({
  ...allFields,
  status: registrationStatus,
  pricing_tier: earlyBirdActive ? 'EARLYBIRD' : 'STANDARD',
  // booth fields from v7...
});

// 3. Create invoice — type depends on gateway
if (fair.payment_gateway_active) {
  // Create a proper invoice record (no payment yet)
  // Status: 'unpaid' — will become 'paid' after Razorpay webhook
  await createInvoiceRecord({
    type: 'TAX',               // will get official number at payment
    ...
  });
  // Send invoice email with Razorpay payment button
  await sendInvoiceEmail(registration);
} else {
  // Create proforma invoice record
  const proformaRef = generateProformaReference();
  await supabase.from('invoices').insert({
    registration_id: registration.id,
    invoice_type: 'PROFORMA',
    proforma_reference: proformaRef,
    invoice_number: null,      // NO official number
    // Amounts stored but GST fields all zero
    payment_currency: body.payment_currency,
    base_amount_usd: grandTotalUSD,
    base_amount_inr: body.payment_currency === 'INR'
      ? grandTotalUSD * forexRate
      : null,
    // ALL GST fields = 0 on proforma
    gst_type: 'NONE',
    cgst_percent: 0, cgst_amount: 0,
    sgst_percent: 0, sgst_amount: 0,
    igst_percent: 0, igst_amount: 0,
    // Total = base only, no GST
    total_amount_usd: grandTotalUSD,
    total_amount_inr: body.payment_currency === 'INR'
      ? grandTotalUSD * forexRate
      : null,
    forex_rate_used: body.payment_currency === 'INR' ? forexRate : null,
    forex_rate_date: body.payment_currency === 'INR'
      ? new Date().toISOString().split('T')[0]
      : null,
    status: 'unpaid',
  });
  // Send proforma email (no payment button)
  await sendProformaEmail(registration, proformaRef);
}

// 4. Return
return NextResponse.json({
  registrationId: registration.id,
  gatewayActive: fair.payment_gateway_active,
  // Client uses this to decide which confirmation page to show
});
```

---

## 4. NEW EMAIL: Proforma Confirmation

```typescript
// emails/ProformaEmail.tsx

Subject: You're Registered — IAES Education Fair 2026 | Ref: PI-2026-XXXX

Dear [Rep Name],

Thank you for registering [University Name] for the
IAES U.S. University Education Outreach Tour & Fair, August 2026.

Your registration is confirmed. Payment will open shortly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROFORMA INVOICE                    [NOT A TAX INVOICE]
Reference: PI-2026-XXXX
Date: 18 May 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

From:
INDO AMERICAN EDUCATION SOCIETY
Ahmedabad, Gujarat | GSTIN: 24AAATI2674J1ZM

To:
[University Name]
[Contact Name, Designation]
[Email]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESCRIPTION                           AMOUNT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fair Registration ([Tier])            USD X,XXX
[Additional Table × N]                USD XXX  (if applicable)
[Additional Rep × N]                  USD XXX  (if applicable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL PAYABLE                         USD X,XXX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[If INR payment selected:]
Indicative INR Amount: ₹X,XX,XXX*
* Indicative only. Final INR amount will be calculated
  at live forex rate on date of payment.
* GST (18%) will be added to the final Tax Invoice.

IMPORTANT NOTES:
• This is a Proforma Invoice only. It is NOT a Tax Invoice.
• No GST has been charged on this document.
• A final Tax Invoice with official number and applicable
  GST will be issued upon receipt of payment.
• You will receive an email notification when the payment
  gateway is open.

For queries: eduadviser@iaesgujarat.org | +91 9825593262

IAES Team
Indo American Education Society
```

---

## 5. NEW EMAIL: "Payment Gateway Now Open"

Sent to ALL `status = 'registered'` universities when admin activates gateway.

```typescript
// emails/GatewayOpenEmail.tsx

Subject: ✅ Payment Now Open — Complete Your IAES Fair 2026 Booking

Dear [Rep Name],

Great news! The payment gateway for the IAES Education Fair 2026
is now open.

Your registration is ready. Please complete your payment
to confirm your booth.

YOUR BOOKING:
  University:     [University Name]
  Booth:          [N] Table(s) · [N] Representatives
  Amount Due:     USD X,XXX
  Proforma Ref:   PI-2026-XXXX

[COMPLETE PAYMENT NOW →]
(links to /invoice/[registrationId])

Payment deadline: [registration_deadline]
Early Bird rate applies if you are within the early bird period.

Once payment is received, your official Tax Invoice will be
issued and your booking will be confirmed.

IAES Team
eduadviser@iaesgujarat.org | +91 9825593262
```

---

## 6. NEW API: `/api/admin/fairs/[fairId]/activate-gateway`

```typescript
// POST /api/admin/fairs/[fairId]/activate-gateway
// Body: { note: string } — optional admin note

// Guards:
// - Fair must be in PUBLISHED or REGISTRATION_CLOSED status
// - Admin must be authenticated

// Actions:
// 1. Update fairs:
//    payment_gateway_active = true
//    gateway_activated_at = NOW()
//    gateway_activation_note = note (optional)

// 2. Update all registrations with status = 'registered':
//    SET status = 'payment_open'

// 3. Fetch all those registrations with contact_email

// 4. Send GatewayOpenEmail to each university
//    (batch via Resend — respect rate limits)

// 5. Log to fair_status_log:
//    note: "Payment gateway activated. X universities notified."

// 6. Return { success: true, notifiedCount: number }
```

---

## 7. UPDATE: Invoice Page (`/invoice/[registrationId]`)

The invoice page must now handle TWO states:

### State A: Gateway Inactive (Proforma)

```
┌─────────────────────────────────────────────────────┐
│  PROFORMA INVOICE              [NOT A TAX INVOICE]  │
│                                                     │
│  Reference: PI-2026-XXXX                            │
│  Date: 18 May 2026                                  │
│                                                     │
│  [IAES details]              [University details]   │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ Description              Amount (USD)          │  │
│  │ Fair Registration        X,XXX                 │  │
│  │ [Extra Table × N]        XXX                   │  │
│  │ [Extra Rep × N]          XXX                   │  │
│  │ ─────────────────────────────────────          │  │
│  │ TOTAL PAYABLE            X,XXX                 │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [If INR selected:]                                 │
│  Indicative INR: ₹X,XX,XXX*                        │
│  *Final amount at live rate on payment date         │
│  *GST (18%) will be added on final Tax Invoice      │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  🕐 Payment gateway opening soon            │   │
│  │  You will receive an email when payment     │   │
│  │  is ready. Your spot is reserved.           │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [ Download Proforma PDF ]                          │
└─────────────────────────────────────────────────────┘
```

### State B: Gateway Active (Pay Now)

```
┌─────────────────────────────────────────────────────┐
│  INVOICE                                            │
│  [Same layout as proforma BUT:]                     │
│                                                     │
│  [If INR — show live forex rate + GST breakdown]    │
│  [If USD — show clean total]                        │
│                                                     │
│  [ Download Proforma PDF ]   [ PAY NOW → ]          │
│                               (Razorpay button)     │
└─────────────────────────────────────────────────────┘
```

Logic:
```typescript
const fair = registration.fair;
const showPaymentButton =
  fair.payment_gateway_active &&
  registration.status !== 'paid' &&
  registration.status !== 'confirmed';
```

---

## 8. PROFORMA PDF (for Download)

Separate PDF component from the Tax Invoice.

```typescript
// components/InvoiceView/ProformaInvoicePDF.tsx

// Same structure as InvoiceUSD.tsx BUT:
// - Header reads "PROFORMA INVOICE" in large text
// - Sub-header: "(This is NOT a Tax Invoice — No GST applicable)"
// - Reference field: "Ref: PI-2026-XXXX" (not Invoice No.)
// - No GST rows in the table
// - Footer note:
//   "This Proforma Invoice is issued as a courtesy prior to
//    payment. It does not constitute a Tax Invoice under the
//    Central Goods and Services Tax Act, 2017. A Tax Invoice
//    bearing an official invoice number and applicable GST
//    will be issued upon receipt of full payment."
// - IAES GSTIN shown (transparency) but with note above
// - No invoice sequence number consumed
```

---

## 9. TAX INVOICE — Generated at Payment (Update Webhook)

In `app/api/razorpay/webhook/route.ts`, after payment is verified:

```typescript
// AFTER payment.captured webhook:

// 1. Fetch registration + existing proforma invoice
const proformaInvoice = await supabase
  .from('invoices')
  .select('*')
  .eq('registration_id', registrationId)
  .eq('invoice_type', 'PROFORMA')
  .single();

// 2. Fetch LIVE forex rate NOW (payment moment)
const { rate: forexRate, date: forexDate } = await getLiveForexRate();

// 3. Calculate GST NOW (on payment receipt)
const gst = calculateGST(
  paymentCurrency,
  baseAmountUSD,
  forexRate,
  payerState,
  isGSTRegistered,
);

// 4. Generate official invoice number NOW
const { data: invoiceNumber } = await supabase
  .rpc('generate_invoice_number');   // IAES-FAIR-2026-001

// 5. Create TAX INVOICE record
await supabase.from('invoices').insert({
  registration_id: registrationId,
  invoice_type: 'TAX',
  invoice_number: invoiceNumber,     // official number
  proforma_reference: proformaInvoice?.proforma_reference ?? null,
                                     // reference back to proforma
  payment_currency: paymentCurrency,
  forex_rate_used: forexRate,
  forex_rate_date: forexDate,
  base_amount_usd: baseAmountUSD,
  base_amount_inr: gst.baseAmountINR,
  gst_type: gst.gstType,
  cgst_percent: gst.cgstPercent,
  cgst_amount: gst.cgstAmount,
  sgst_percent: gst.sgstPercent,
  sgst_amount: gst.sgstAmount,
  igst_percent: gst.igstPercent,
  igst_amount: gst.igstAmount,
  total_amount_inr: gst.totalAmountINR,
  total_amount_usd: paymentCurrency === 'USD' ? baseAmountUSD : null,
  status: 'paid',
  issued_at: new Date().toISOString(),
});

// 6. Update registration status
await supabase.from('registrations')
  .update({ status: 'confirmed' })
  .eq('id', registrationId);

// 7. Send Tax Invoice + Confirmation email
await sendConfirmationEmail(registration, taxInvoice);
```

---

## 10. TAX INVOICE — Reference to Proforma

On the Tax Invoice PDF, add one line under the invoice number:

```
Invoice No:     IAES-FAIR-2026-001
Invoice Date:   25 May 2026
Proforma Ref:   PI-2026-XXXX        ← links this to original proforma
Forex Rate:     1 USD = ₹84.23 (as on 25 May 2026)
```

This provides a clean paper trail from registration → proforma → tax invoice.

---

## 11. UPDATE: Confirmation Page (`/confirmation/[registrationId]`)

Two states:

### Proforma State (gateway inactive)
```
┌──────────────────────────────────────────────┐
│  ✅ You're Registered!                       │
│                                              │
│  [University Name]                           │
│  IAES Education Fair — August 2026           │
│                                              │
│  Proforma Ref: PI-2026-XXXX                  │
│  Amount Due:   USD X,XXX                     │
│                                              │
│  Your spot is reserved.                      │
│  We'll email you when payment opens.         │
│                                              │
│  [Download Proforma Invoice]                 │
│                                              │
│  Questions? eduadviser@iaesgujarat.org       │
└──────────────────────────────────────────────┘
```

### Paid State (after payment)
```
┌──────────────────────────────────────────────┐
│  ✅ Booking Confirmed!                       │
│                                              │
│  [University Name]                           │
│  IAES Education Fair — August 2026           │
│                                              │
│  Tax Invoice: IAES-FAIR-2026-001             │
│  Amount Paid: USD X,XXX / ₹X,XX,XXX         │
│                                              │
│  [Download Tax Invoice]                      │
└──────────────────────────────────────────────┘
```

---

## 12. UPDATE: Admin Fair Control Panel

Add gateway toggle in the Lifecycle section:

```
STEP 2.5: PAYMENT GATEWAY                    [● INACTIVE]

Razorpay gateway is currently OFF.
Universities can register but cannot pay.

Registered (awaiting payment):  12 universities
                                                    
[ ▶ ACTIVATE PAYMENT GATEWAY ]

On activation:
• Razorpay payment button appears on all invoice pages
• 12 registered universities will receive "Payment Open" email
• New registrations will go directly to payment

Add a note (optional):
[Razorpay account verified — 25 May 2026    ]

[ ACTIVATE NOW ]
```

After activation:
```
STEP 2.5: PAYMENT GATEWAY                    [● ACTIVE]
Activated: 25 May 2026, 10:30 AM
Note: Razorpay account verified
12 universities notified by email.

[Deactivate Gateway]   ← emergency only, requires confirmation
```

---

## 13. UPDATE: Landing Page — Registration CTA

When `payment_gateway_active = false`, update the university card CTA:

```tsx
// In app/page.tsx

<Link href="/register/university" className="...">
  {fair.payment_gateway_active
    ? "Register & Pay Now →"
    : "Register Now — Pay Later →"
  }
</Link>

{!fair.payment_gateway_active && (
  <p className="mt-2 text-xs text-center text-gray-400">
    Payment gateway opens soon.
    Register now to secure your spot.
  </p>
)}
```

---

## 14. UPDATE: Types — `types/index.ts`

```typescript
// Update Fair interface:
export interface Fair {
  // ... existing fields ...
  payment_gateway_active: boolean;
  gateway_activated_at: string | null;
  gateway_activation_note: string | null;
}

// Update Invoice interface:
export interface Invoice {
  // ... existing fields ...
  invoice_type: 'PROFORMA' | 'TAX';
  proforma_reference: string | null;
}

// Update registration status union:
export type RegistrationStatus =
  | 'registered'
  | 'payment_open'
  | 'pending'
  | 'invoice_sent'
  | 'paid'
  | 'confirmed'
  | 'cancelled';
```

---

## BUILD ORDER FOR V8 (run after v7 is complete)

1.  SQL: `ALTER TABLE fairs` — add gateway columns
2.  SQL: `ALTER TABLE registrations` — update status constraint
3.  SQL: `ALTER TABLE invoices` — add invoice_type, proforma_reference
4.  Update `types/index.ts` — Fair, Invoice, RegistrationStatus
5.  Update `lib/invoice.ts` — add `generateProformaReference()`
6.  Update `app/api/register/route.ts` — dual path (proforma vs payment)
7.  Create `emails/ProformaEmail.tsx`
8.  Create `emails/GatewayOpenEmail.tsx`
9.  Create `components/InvoiceView/ProformaInvoicePDF.tsx`
10. Update `app/invoice/[registrationId]/page.tsx` — dual state display
11. Update `app/confirmation/[registrationId]/page.tsx` — dual state
12. Create `app/api/admin/fairs/[fairId]/activate-gateway/route.ts`
13. Update `app/admin/fairs/[fairId]/page.tsx` — gateway toggle UI
14. Update `app/page.tsx` — CTA text + note when gateway inactive
15. Update `app/api/razorpay/webhook/route.ts` — generate tax invoice at payment

---

## CRITICAL RULES FOR V8

- Proforma invoice NEVER consumes the invoice_counter sequence
- invoice_number is NULL on proforma records — always
- Tax invoice number is generated ONLY inside the Razorpay webhook
  (i.e. ONLY after payment is captured and verified)
- Forex rate for INR invoices is fetched LIVE at payment time
  (proforma shows indicative rate with * note)
- GST fields are ALL zero on proforma — populated only on tax invoice
- Gateway activation sends emails to ALL status='registered' universities
- After gateway activation: new registrations skip proforma, go to payment
- Deactivating gateway after activation is an emergency action only —
  requires confirmation dialog with warning text
- Paper trail: tax invoice stores proforma_reference for audit purposes
- Do NOT rebuild anything from v1–v7
