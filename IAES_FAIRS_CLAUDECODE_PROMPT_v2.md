# IAES Fairs — Claude Code Build Prompt v2
# Project: iaes-fairs | fairs.iaesgujarat.org
# Updated: Full GST Compliance + Dual Currency

---

## IAES LEGAL DETAILS (appears on every invoice)

```
Legal Name:   INDO AMERICAN EDUCATION SOCIETY
Address:      3rd Floor, 301-302, Sun Square,
              Near Xavier's Corner, Off C G Road,
              Navarangpura, Ahmedabad - 380009
              Gujarat, India
GSTIN:        24AAATI2674J1ZM
PAN:          AAATI2674J
State:        Gujarat (State Code: 24)
SAC Code:     998596 (Convention and Trade Show Organizer Services)
Email:        eduadviser@iaesgujarat.org
Phone:        +91 9825593262
```

---

## WHO YOU ARE BUILDING FOR

**IAES = Indo American Education Society**, Ahmedabad, Gujarat.
A nonprofit that hosts Education USA Fairs — events where American universities pay to participate and meet Indian students.

**This platform manages the full fair registration lifecycle for universities:**
Registration → Currency Choice → GST Calculation → Invoice → Payment (Razorpay) → Booking Confirmed

**Primary users:**
- **Universities** (US-based): Register, choose INR or USD, receive GST-compliant invoice, pay, get confirmation
- **IAES Admin**: View all registrations, payment status, GST reports, download data

---

## TECH STACK

- **Framework**: Next.js 14 (App Router)
- **Database + Auth**: Supabase
- **Payments**: Razorpay (INR) + Razorpay International (USD)
- **Emails**: Resend (verified domain: iaesgujarat.org)
- **PDF**: @react-pdf/renderer
- **Forex API**: https://api.exchangerate-api.com/v4/latest/USD (free, no key needed)
- **Styling**: Tailwind CSS
- **Hosting**: Netlify
- **Language**: TypeScript

---

## BRAND IDENTITY

- **Colors**: Navy Blue `#0B2B5C` (primary), Gold `#C9A227` (accent), White `#FFFFFF`, Light Gray `#F5F7FA`
- **Fonts**: Playfair Display (headings) + DM Sans (body)
- **Tone**: Institutional, trustworthy, professional

---

## DATABASE SCHEMA

Run all SQL in Supabase SQL editor in this exact order:

### Table 1: `fairs`
```sql
CREATE TABLE fairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Ahmedabad',
  venue TEXT,
  fair_date DATE NOT NULL,
  registration_deadline DATE,
  booth_price_usd NUMERIC(10,2) NOT NULL,
  max_universities INTEGER DEFAULT 30,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO fairs (name, city, venue, fair_date, registration_deadline, booth_price_usd, description)
VALUES (
  'EducationUSA India Fair 2025',
  'Ahmedabad',
  'Hotel Courtyard by Marriott, Ahmedabad',
  '2025-11-15',
  '2025-10-31',
  500.00,
  'Annual flagship fair connecting American universities with top Gujarati students. Expected 1000+ student attendees.'
);
```

### Table 2: `registrations`
```sql
CREATE TABLE registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) NOT NULL,

  -- University Details
  university_name TEXT NOT NULL,
  university_country TEXT DEFAULT 'USA',
  university_website TEXT,

  -- Contact Person
  contact_name TEXT NOT NULL,
  contact_title TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  -- Booth
  booth_type TEXT DEFAULT 'Standard',
  number_of_reps INTEGER DEFAULT 1,

  -- Payment Preference
  payment_currency TEXT DEFAULT 'USD' CHECK (payment_currency IN ('USD', 'INR')),

  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'invoice_sent', 'paid', 'confirmed', 'cancelled')),

  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table 3: `billing_details`
```sql
CREATE TABLE billing_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id) UNIQUE NOT NULL,

  -- Required for INR payments
  legal_name TEXT NOT NULL,        -- Legal entity name as per GST
  billing_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,             -- Determines CGST/SGST vs IGST
  pin_code TEXT NOT NULL,
  pan_number TEXT NOT NULL,

  -- GST Registration
  is_gst_registered BOOLEAN DEFAULT false,
  gstin TEXT,                      -- 15-digit, required if is_gst_registered = true

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table 4: `invoices`
```sql
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id) NOT NULL,

  invoice_number TEXT UNIQUE NOT NULL,   -- IAES-FAIR-2025-001

  -- Currency & Forex
  payment_currency TEXT NOT NULL,        -- 'USD' or 'INR'
  forex_rate_used NUMERIC(10,4),         -- e.g. 83.5200 (locked at invoice time)
  forex_rate_date DATE,                  -- Date forex rate was fetched

  -- Amounts
  base_amount_usd NUMERIC(10,2) NOT NULL,
  base_amount_inr NUMERIC(10,2),         -- base_amount_usd × forex_rate_used

  -- GST (INR only)
  gst_type TEXT DEFAULT 'NONE'
    CHECK (gst_type IN ('NONE', 'IGST', 'CGST_SGST')),

  -- CGST + SGST (Gujarat payer)
  cgst_percent NUMERIC(5,2) DEFAULT 0,
  cgst_amount NUMERIC(10,2) DEFAULT 0,
  sgst_percent NUMERIC(5,2) DEFAULT 0,
  sgst_amount NUMERIC(10,2) DEFAULT 0,

  -- IGST (Non-Gujarat payer)
  igst_percent NUMERIC(5,2) DEFAULT 0,
  igst_amount NUMERIC(10,2) DEFAULT 0,

  -- Totals
  total_amount_inr NUMERIC(10,2),
  total_amount_usd NUMERIC(10,2),

  -- Invoice meta
  due_date DATE,
  pdf_url TEXT,
  status TEXT DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'paid', 'cancelled')),

  issued_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table 5: `payments`
```sql
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  registration_id UUID REFERENCES registrations(id) NOT NULL,

  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,

  amount_paid NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL,                -- 'INR' or 'USD'
  payment_method TEXT,
  payment_status TEXT DEFAULT 'initiated'
    CHECK (payment_status IN ('initiated', 'success', 'failed', 'refunded')),

  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table 6: `admin_users`
```sql
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO admin_users (email, name)
VALUES ('eduadviser@iaesgujarat.org', 'IAES Admin');
```

### Invoice Number Sequence
```sql
CREATE SEQUENCE invoice_counter START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'IAES-FAIR-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
         LPAD(nextval('invoice_counter')::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
```

---

## GST CALCULATION LOGIC

This is the most critical business logic. Implement as a pure function in `lib/gst.ts`:

```typescript
// lib/gst.ts

export type GSTType = 'NONE' | 'IGST' | 'CGST_SGST';

export interface GSTCalculation {
  gstType: GSTType;
  baseAmountINR: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  totalAmountINR: number;
}

export function calculateGST(
  paymentCurrency: 'USD' | 'INR',
  baseAmountUSD: number,
  forexRate: number,
  payerState: string | null,    // e.g. "Gujarat", "Maharashtra"
  isGSTRegistered: boolean
): GSTCalculation {

  // USD payments: NO GST (export of service)
  if (paymentCurrency === 'USD') {
    return {
      gstType: 'NONE',
      baseAmountINR: 0,
      cgstPercent: 0, cgstAmount: 0,
      sgstPercent: 0, sgstAmount: 0,
      igstPercent: 0, igstAmount: 0,
      totalAmountINR: 0,
    };
  }

  // INR payments: Calculate base in INR
  const baseAmountINR = parseFloat((baseAmountUSD * forexRate).toFixed(2));

  // Determine GST type based on payer's state
  // IAES is in Gujarat (State Code 24)
  // Same state = CGST + SGST (intra-state)
  // Different state = IGST (inter-state)
  const isGujaratPayer = payerState?.toLowerCase() === 'gujarat';

  if (isGujaratPayer) {
    // CGST 9% + SGST 9%
    const cgstAmount = parseFloat((baseAmountINR * 0.09).toFixed(2));
    const sgstAmount = parseFloat((baseAmountINR * 0.09).toFixed(2));
    return {
      gstType: 'CGST_SGST',
      baseAmountINR,
      cgstPercent: 9, cgstAmount,
      sgstPercent: 9, sgstAmount,
      igstPercent: 0, igstAmount: 0,
      totalAmountINR: parseFloat((baseAmountINR + cgstAmount + sgstAmount).toFixed(2)),
    };
  } else {
    // IGST 18%
    const igstAmount = parseFloat((baseAmountINR * 0.18).toFixed(2));
    return {
      gstType: 'IGST',
      baseAmountINR,
      cgstPercent: 0, cgstAmount: 0,
      sgstPercent: 0, sgstAmount: 0,
      igstPercent: 18, igstAmount,
      totalAmountINR: parseFloat((baseAmountINR + igstAmount).toFixed(2)),
    };
  }
}
```

---

## FOREX RATE FETCHING

```typescript
// lib/forex.ts

export async function getLiveForexRate(): Promise<{
  rate: number;
  date: string;
}> {
  const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
  const data = await res.json();
  return {
    rate: data.rates.INR,
    date: new Date().toISOString().split('T')[0],
  };
}
```

**Important:** Fetch the rate once at invoice generation time. Store `forex_rate_used` and `forex_rate_date` in the invoice record. Never recalculate with a different rate later.

---

## FOLDER STRUCTURE

```
iaes-fairs/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Fair landing page
│   ├── register/
│   │   └── page.tsx                      # 3-step registration form
│   ├── invoice/
│   │   └── [registrationId]/
│   │       └── page.tsx                  # Invoice view + Pay button
│   ├── payment/
│   │   └── [registrationId]/
│   │       └── page.tsx                  # Razorpay checkout
│   ├── confirmation/
│   │   └── [registrationId]/
│   │       └── page.tsx                  # Booking confirmed
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── dashboard/
│   │       └── page.tsx
│   └── api/
│       ├── register/
│       │   └── route.ts
│       ├── forex/
│       │   └── route.ts                  # GET: live USD→INR rate
│       ├── razorpay/
│       │   ├── create-order/
│       │   │   └── route.ts
│       │   └── webhook/
│       │       └── route.ts
│       └── admin/
│           └── registrations/
│               └── route.ts
├── components/
│   ├── FairHero.tsx
│   ├── FairDetails.tsx
│   ├── RegistrationForm/
│   │   ├── Step1University.tsx           # University details
│   │   ├── Step2Contact.tsx              # Contact person
│   │   └── Step3Payment.tsx             # Currency + GST details
│   ├── InvoiceView/
│   │   ├── InvoiceUSD.tsx               # Clean USD invoice
│   │   └── InvoiceINR.tsx               # Full GST-compliant invoice
│   ├── PaymentButton.tsx
│   ├── ConfirmationCard.tsx
│   └── AdminTable.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── gst.ts                           # GST calculation (above)
│   ├── forex.ts                         # Forex rate fetching (above)
│   ├── razorpay.ts
│   └── resend.ts
├── emails/
│   ├── InvoiceEmail.tsx
│   └── ConfirmationEmail.tsx
└── types/
    └── index.ts
```

---

## REGISTRATION FORM — 3 STEPS

### Step 1: University Details
- University Name* 
- Country* (dropdown, default: USA)
- University Website
- Booth Type* (Standard / Premium)
- Number of Representatives* (1–5)

### Step 2: Contact Person
- Full Name*
- Designation/Title*
- Email Address* (invoice will be sent here)
- Phone (with country code)
- Special Requests

### Step 3: Payment Preference ← KEY STEP

```
How would you like to pay?

○ Pay in USD (Recommended for US offices)
  No GST applicable. Invoice in US Dollars.

○ Pay in INR (For India-based offices)
  GST applicable as per Indian tax law.
  Invoice in Indian Rupees at today's forex rate.
```

**If INR selected — show additional fields:**

```
Billing Information (as per GST records)

Legal Entity Name*         [text]
Billing Address*           [textarea]
City*                      [text]
State*                     [dropdown - all Indian states]
PIN Code*                  [text]
PAN Number*                [text - validate format: 5 letters + 4 digits + 1 letter]

GST Registration
Are you GST registered in India?  ○ Yes  ○ No

If Yes:
GSTIN*                     [text - validate 15-char format]
```

**Live preview box below the form (INR path):**
```
┌─────────────────────────────────────┐
│  ESTIMATED INVOICE AMOUNT           │
│                                     │
│  Booth Fee:    USD 500              │
│  Forex Rate:   1 USD = ₹83.52       │
│  Base Amount:  ₹41,760              │
│  IGST 18%:     ₹7,517              │  ← or CGST+SGST if Gujarat
│  ─────────────────────────────      │
│  TOTAL:        ₹49,277             │
│                                     │
│  * Final amount locked at invoice   │
└─────────────────────────────────────┘
```

Fetch live forex rate via `/api/forex` when Step 3 loads. Update the preview live as state dropdown changes (Gujarat = CGST+SGST, others = IGST).

---

## API: REGISTER (`/api/register`)

```typescript
// POST /api/register
// 1. Validate all fields
// 2. Insert into registrations table
// 3. If INR: insert into billing_details table
// 4. Fetch live forex rate (if INR)
// 5. Calculate GST using lib/gst.ts
// 6. Generate invoice number using DB function
// 7. Insert into invoices table with all GST fields
// 8. Send invoice email via Resend
// 9. Return { registrationId, invoiceId }
```

---

## INVOICE DISPLAY — TWO VERSIONS

### USD Invoice (`components/InvoiceView/InvoiceUSD.tsx`)

```
┌─────────────────────────────────────────────────────┐
│  [IAES LOGO]                           INVOICE      │
│                                                     │
│  INDO AMERICAN EDUCATION SOCIETY                    │
│  3rd Floor, 301-302, Sun Square                     │
│  Navarangpura, Ahmedabad - 380009                   │
│  GSTIN: 24AAATI2674J1ZM                             │
│  PAN: AAATI2674J                                    │
│                                                     │
│  Invoice No: IAES-FAIR-2025-001                     │
│  Date: 14 May 2025                                  │
│  Due Date: 31 Oct 2025                              │
│                                                     │
│  Bill To:                                           │
│  [University Name]                                  │
│  [Contact Name, Designation]                        │
│  [Email]                                            │
│                                                     │
│  ┌───────────────────────────────────────────┐     │
│  │ SAC    Description              Amount    │     │
│  │ 998596 Fair Booth - Standard    USD 500   │     │
│  │                                           │     │
│  │ GST: Not applicable                       │     │
│  │ (Export of Service - Zero Rated)          │     │
│  │ ─────────────────────────────────         │     │
│  │ TOTAL                           USD 500   │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
│  [ Download PDF ]    [ Pay in USD → ]               │
└─────────────────────────────────────────────────────┘
```

### INR Invoice — CGST+SGST variant (`components/InvoiceView/InvoiceINR.tsx`)

```
┌─────────────────────────────────────────────────────┐
│  [IAES LOGO]                        TAX INVOICE     │
│                                                     │
│  INDO AMERICAN EDUCATION SOCIETY                    │
│  3rd Floor, 301-302, Sun Square                     │
│  Navarangpura, Ahmedabad - 380009, Gujarat          │
│  GSTIN: 24AAATI2674J1ZM | PAN: AAATI2674J          │
│  SAC Code: 998596                                   │
│                                                     │
│  Invoice No: IAES-FAIR-2025-001                     │
│  Invoice Date: 14 May 2025                          │
│  Due Date: 31 Oct 2025                              │
│  Forex Rate: 1 USD = ₹83.52 (as on 14 May 2025)   │
│                                                     │
│  Bill To:                                           │
│  [Legal Entity Name]                                │
│  [Full Billing Address]                             │
│  [City, State - PIN]                                │
│  GSTIN: [payer GSTIN or "Unregistered"]             │
│  PAN: [payer PAN]                                   │
│                                                     │
│  ┌────────────────────────────────────────────┐    │
│  │ SAC  Description        Rate  Amount (₹)  │    │
│  │ 998596 Booth-Standard  500USD  ₹41,760    │    │
│  │                                            │    │
│  │ CGST @ 9%                       ₹3,758    │    │
│  │ SGST @ 9%                       ₹3,758    │    │
│  │ ──────────────────────────────────────     │    │
│  │ TOTAL                          ₹49,276    │    │
│  └────────────────────────────────────────────┘    │
│                                                     │
│  Amount in words: Rupees Forty Nine Thousand...     │
│                                                     │
│  [ Download PDF ]    [ Pay in INR → ]               │
└─────────────────────────────────────────────────────┘
```

For IGST variant: replace CGST+SGST rows with single IGST @ 18% row.

---

## RAZORPAY INTEGRATION

### INR Payments
```typescript
// Standard Razorpay order in INR
const order = await razorpay.orders.create({
  amount: Math.round(totalAmountINR * 100), // paise
  currency: 'INR',
  receipt: invoiceNumber,
});
```

### USD Payments
```typescript
// Razorpay international — currency USD
const order = await razorpay.orders.create({
  amount: Math.round(totalAmountUSD * 100), // cents
  currency: 'USD',
  receipt: invoiceNumber,
});
```

Razorpay options for both:
```javascript
{
  key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  order_id: razorpayOrderId,
  name: "IAES Education USA Fair",
  description: "Fair Booth Registration",
  prefill: { name, email, contact },
  theme: { color: "#0B2B5C" },
}
```

---

## EMAIL TEMPLATES

### Invoice Email
```
Subject: Tax Invoice — EducationUSA Fair 2025 | [Invoice No]

Dear [Contact Name],

Please find your invoice for booth registration at EducationUSA India Fair 2025.

Invoice No:   IAES-FAIR-2025-001
Amount:       [₹49,276 INR / USD 500]
Due Date:     31 October 2025

[PAY NOW →]

For queries: eduadviser@iaesgujarat.org | +91 9825593262

IAES Team
```

### Confirmation Email
```
Subject: ✅ Booth Confirmed — EducationUSA Fair 2025

Dear [Contact Name],

Your booth at EducationUSA India Fair 2025 is confirmed.

University:   [Name]
Invoice:      IAES-FAIR-2025-001
Amount Paid:  [₹49,276 / USD 500]
Fair Date:    15 November 2025
Venue:        Hotel Courtyard by Marriott, Ahmedabad

We will share the event briefing pack 4 weeks before the fair.

IAES Team
Indo American Education Society
+91 9825593262 | eduadviser@iaesgujarat.org
```

---

## ADMIN DASHBOARD

### Summary Cards
- Total Registrations | Confirmed | Pending | INR Revenue (₹) | USD Revenue ($)

### Table Columns
| University | Contact | Currency | Amount | GST Type | Status | Date | Actions |

### GST Report Section
- Total CGST collected
- Total SGST collected  
- Total IGST collected
- Export button: GST Summary CSV (for CA/accountant)

### Status Badges
- `pending` → Yellow
- `invoice_sent` → Blue
- `paid` → Purple
- `confirmed` → Green
- `cancelled` → Red

---

## ENVIRONMENT VARIABLES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=fairs@iaesgujarat.org

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## DEPENDENCIES

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install razorpay
npm install resend
npm install @react-pdf/renderer
npm install react-hook-form zod @hookform/resolvers
npm install @tanstack/react-table
npm install lucide-react
npm install clsx tailwind-merge
```

---

## BUILD ORDER

1. Setup — Next.js + Tailwind + dependencies
2. Supabase — all 6 tables + seed fair
3. Types — TypeScript interfaces for all entities
4. `lib/gst.ts` — GST calculation function
5. `lib/forex.ts` — Live forex rate fetcher
6. `lib/razorpay.ts` — Razorpay instance
7. `lib/resend.ts` — Email sender
8. `app/api/forex/route.ts` — GET forex rate
9. `app/api/register/route.ts` — Full registration + invoice creation
10. `app/page.tsx` — Fair landing page
11. `app/register/page.tsx` — 3-step form with live GST preview
12. `app/api/razorpay/create-order/route.ts`
13. `app/invoice/[registrationId]/page.tsx` — Correct invoice version (USD or INR)
14. `app/payment/[registrationId]/page.tsx` — Razorpay checkout
15. `app/api/razorpay/webhook/route.ts` — Payment confirmation
16. `app/confirmation/[registrationId]/page.tsx`
17. `emails/` — Invoice + Confirmation templates
18. `app/admin/login/page.tsx`
19. `app/admin/dashboard/page.tsx` — With GST report section
20. `netlify.toml` — Deploy config

---

## CRITICAL RULES FOR CLAUDE CODE

- GST type is determined by **payer's state**, not GSTIN prefix
- Gujarat payer → CGST 9% + SGST 9%
- Non-Gujarat payer → IGST 18%
- USD payer → NO GST (zero rated export of service)
- Forex rate is **locked at invoice generation** — never change it after
- Invoice number uses DB sequence — always unique, always sequential
- PAN validation regex: `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`
- GSTIN validation regex: `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`
- Admin routes must verify Supabase session
- All amounts in DB stored as full rupees/dollars (not paise/cents)
- Razorpay receives amounts in paise/cents (multiply by 100)
- SAC code on every invoice: **998596**
- IAES GSTIN on every invoice: **24AAATI2674J1ZM**
