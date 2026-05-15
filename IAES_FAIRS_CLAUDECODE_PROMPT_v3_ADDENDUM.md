# IAES Fairs — Claude Code Prompt v3 (ADDENDUM TO V2)
# Read this AFTER v2 is complete. These are additions and corrections only.
# Do NOT rebuild what v2 already built. Only add/modify what's listed here.

---

## CHANGES FROM V2

### 1. FOREX RATE — Confirm Dynamic (v2 is correct)
`lib/forex.ts` in v2 already fetches live rate. This is correct. Keep it.
Do NOT use a fixed rate stored in the `fairs` table.
The live rate is fetched at invoice generation, shown to the user, and locked into the invoice record.
Display it clearly on Step 3 of the registration form:
```
"Today's rate: 1 USD = ₹83.42"
"(as of 15 May 2026, 4:23 PM IST — locked at invoice generation)"
```

---

### 2. UPDATE: `fairs` TABLE — Add Missing Fields

Run this migration in Supabase to add new columns to the existing `fairs` table:

```sql
-- Add to existing fairs table
ALTER TABLE fairs
  ADD COLUMN fair_date_start DATE,
  ADD COLUMN fair_date_end DATE,
  ADD COLUMN arrive_by DATE,
  ADD COLUMN depart_after DATE,
  ADD COLUMN registration_deadline DATE,

  -- Early Bird Pricing
  ADD COLUMN price_standard_usd NUMERIC(10,2),
  ADD COLUMN price_standard_inr NUMERIC(10,2),
  ADD COLUMN price_earlybird_usd NUMERIC(10,2),
  ADD COLUMN price_earlybird_inr NUMERIC(10,2),
  ADD COLUMN earlybird_deadline DATE,

  -- What's included (shown on landing page)
  ADD COLUMN includes TEXT[] DEFAULT '{}';

-- Update the seeded fair with real data
UPDATE fairs SET
  fair_date_start = '2026-08-06',
  fair_date_end = '2026-08-08',
  arrive_by = '2026-08-05',
  depart_after = '2026-08-09',
  registration_deadline = '2026-07-05',
  price_standard_usd = 1700.00,
  price_standard_inr = 161500.00,
  price_earlybird_usd = 1500.00,
  price_earlybird_inr = 142500.00,
  earlybird_deadline = '2026-06-15',
  booth_price_usd = 1700.00,
  includes = ARRAY[
    'Travel to institute visits by cabs arranged by IAES',
    'Logistics and lunch during all days'
  ],
  name = 'IAES U.S. University Education Fair — August 2026',
  city = 'Ahmedabad',
  venue = 'Ahmedabad (venue TBC)'
WHERE name = 'EducationUSA India Fair 2025';
```

---

### 3. EARLY BIRD LOGIC — New Helper Function

Add to `lib/pricing.ts`:

```typescript
// lib/pricing.ts

export type PricingTier = 'EARLYBIRD' | 'STANDARD';

export interface FairPricing {
  tier: PricingTier;
  priceUSD: number;
  priceINR: number;
  isEarlyBird: boolean;
  earlyBirdDeadline: string | null;
  registrationDeadline: string | null;
}

export function getFairPricing(fair: {
  price_standard_usd: number;
  price_standard_inr: number;
  price_earlybird_usd: number | null;
  price_earlybird_inr: number | null;
  earlybird_deadline: string | null;
  registration_deadline: string | null;
}): FairPricing {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isEarlyBird =
    fair.price_earlybird_usd !== null &&
    fair.earlybird_deadline !== null &&
    today <= new Date(fair.earlybird_deadline);

  return {
    tier: isEarlyBird ? 'EARLYBIRD' : 'STANDARD',
    priceUSD: isEarlyBird
      ? fair.price_earlybird_usd!
      : fair.price_standard_usd,
    priceINR: isEarlyBird
      ? fair.price_earlybird_inr!
      : fair.price_standard_inr,
    isEarlyBird,
    earlyBirdDeadline: fair.earlybird_deadline,
    registrationDeadline: fair.registration_deadline,
  };
}
```

**Use this function everywhere a price is shown or calculated.**
On the landing page, show an early bird badge if applicable:
```
[🟡 EARLY BIRD RATE ACTIVE — Ends 15 June 2026]
USD 1,500  (Save USD 200)
```
After deadline passes, badge disappears and standard rate applies automatically.

---

### 4. UPDATE: `registrations` TABLE — Add Pricing Tier

```sql
ALTER TABLE registrations
  ADD COLUMN pricing_tier TEXT DEFAULT 'STANDARD'
    CHECK (pricing_tier IN ('STANDARD', 'EARLYBIRD'));
```

Store which tier was active at time of registration. This is the locked price — even if early bird expires after they register, they pay the tier that was active when they submitted.

---

### 5. NEW TABLE: `institution_registrations`

This is a completely new table — no payment involved.

```sql
CREATE TABLE institution_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) NOT NULL,

  -- Institution Details
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL
    CHECK (institution_type IN (
      'School', 'Junior College', 'Degree College',
      'University', 'Coaching Institute', 'Other'
    )),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  website TEXT,

  -- Contact Person
  contact_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Student Details
  expected_student_count INTEGER NOT NULL,
  courses TEXT[] DEFAULT '{}',
  year_semester TEXT[] DEFAULT '{}',
  fields_of_interest TEXT[] DEFAULT '{}',
  budget_range TEXT,

  -- Consents
  whatsapp_consent BOOLEAN DEFAULT false,
  email_consent BOOLEAN DEFAULT true,
  data_sharing_consent BOOLEAN DEFAULT false,

  -- Status (no payment)
  status TEXT DEFAULT 'registered'
    CHECK (status IN ('registered', 'confirmed', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 6. NEW PAGE: `/register/institution`

4-step form. No payment. Free registration.

**Step 1 — Institution Details:**
```
Institution Name*         text
Institution Type*         dropdown:
                          School (Std 11-12)
                          Junior College
                          Degree College
                          University / Campus
                          Coaching Institute
                          Other
City*                     text
State*                    dropdown (all Indian states)
Website                   url (optional)
```

**Step 2 — Contact Person:**
```
Contact Name*             text
Designation*              text (e.g. Principal, Career Counsellor)
Email Address*            email
Phone / WhatsApp*         text (with +91 prefix shown)
```

**Step 3 — Student Details:**
```
Expected Number of
Students Attending*       number (min: 1)

Current Course / Stream*  multi-select checkboxes:
                          □ Science (PCM / PCB)
                          □ Commerce
                          □ Arts / Humanities
                          □ Engineering (BE/BTech)
                          □ Management (BBA/MBA)
                          □ Law
                          □ Medicine
                          □ Other

Year / Semester*          multi-select checkboxes:
                          □ Std 11  □ Std 12
                          □ 1st Year  □ 2nd Year
                          □ 3rd Year  □ 4th Year
                          □ Postgraduate

Fields of Interest
in USA*                   multi-select checkboxes:
                          □ Computer Science / IT
                          □ Engineering
                          □ Business / Management
                          □ Health Sciences
                          □ Arts & Design
                          □ Social Sciences
                          □ Law
                          □ Other

Budget Range*             dropdown:
                          Under ₹30 Lakhs/year
                          ₹30–50 Lakhs/year
                          ₹50–80 Lakhs/year
                          Above ₹80 Lakhs/year
                          Open / Scholarship seeking
```

**Step 4 — Consents:**
```
□ Send us WhatsApp updates about the fair
☑ Send us email updates (default ON)
□ I consent to sharing student interest details
  with participating US universities at the fair
```

**On Submit:**
- POST to `/api/register/institution`
- Insert into `institution_registrations`
- Send confirmation email via Resend to contact email
- Redirect to `/confirmation/institution/[id]`

---

### 7. NEW API: `/api/register/institution`

```typescript
// POST /api/register/institution
// 1. Validate all fields
// 2. Insert into institution_registrations
// 3. Send confirmation email via Resend
// 4. Return { registrationId }
```

---

### 8. NEW PAGE: `/confirmation/institution/[id]`

```
✅ Registration Confirmed!

[Institution Name] is registered for
IAES U.S. University Education Fair — August 2026

Fair Dates:    6–8 August 2026
Venue:         Ahmedabad (TBC)
Students:      [expected_student_count] expected

A confirmation email has been sent to [email].
IAES will share the detailed itinerary closer to the fair.

Questions? eduadviser@iaesgujarat.org | +91 9825593262
```

---

### 9. NEW EMAIL: Institution Confirmation (`emails/InstitutionConfirmationEmail.tsx`)

```
Subject: Registration Confirmed — IAES Education Fair Aug 2026

Dear [Contact Name],

Thank you for registering [Institution Name] for the
IAES U.S. University Education Fair, August 2026.

Details:
  Institution:    [Institution Name]
  City:           [City], [State]
  Students:       [Count] expected
  Fair Dates:     6–8 August 2026, Ahmedabad

We will share the detailed programme and venue information
closer to the fair date.

For questions:
eduadviser@iaesgujarat.org | +91 9825593262

IAES Team
Indo American Education Society, Ahmedabad
```

---

### 10. UPDATE: Landing Page (`app/page.tsx`)

Add two clear CTAs below the fair description:

```
┌─────────────────────┐    ┌─────────────────────┐
│  🎓 U.S. University │    │  🏫 Indian           │
│                     │    │  Institution         │
│  Register your      │    │                      │
│  university for     │    │  Register to bring   │
│  the fair           │    │  your students       │
│                     │    │                      │
│  USD 1,500*         │    │  FREE                │
│  *Early Bird        │    │                      │
│                     │    │                      │
│  [Register Now →]   │    │  [Register Free →]   │
└─────────────────────┘    └─────────────────────┘
```

Left card links to `/register/university`
Right card links to `/register/institution`

Show early bird badge + deadline on university card if active.
Show "Registration closes July 05, 2026" under both cards.

---

### 11. UPDATE: Admin Dashboard (`app/admin/dashboard/page.tsx`)

Add a second tab:

```
[University Registrations]  [Institution Registrations]
```

**Institution Registrations tab columns:**
| Institution | Type | City | State | Contact | Email | Students | Status | Date |

Add summary card:
- Total Institutions Registered
- Total Expected Students

---

### 12. UPDATE: Seed Data for `.env.local`

No change needed — Resend domain already verified as `iaesgujarat.org`.
Add institution confirmation email sender:
```env
RESEND_FROM_EMAIL=fairs@iaesgujarat.org   # already set in v2
```

---

## BUILD ORDER FOR V3 (run after v2 is complete)

1. Run the `ALTER TABLE fairs` migration
2. Run the `ALTER TABLE registrations` migration
3. Run the `CREATE TABLE institution_registrations` migration
4. Create `lib/pricing.ts` with early bird logic
5. Update `app/page.tsx` — dual CTA landing page
6. Update `/register/university` Step 3 — show early bird price
7. Update `/api/register` — store `pricing_tier`
8. Create `app/register/institution/page.tsx` — 4-step form
9. Create `app/api/register/institution/route.ts`
10. Create `app/confirmation/institution/[id]/page.tsx`
11. Create `emails/InstitutionConfirmationEmail.tsx`
12. Update `app/admin/dashboard/page.tsx` — add institution tab

---

## CRITICAL RULES FOR V3

- Early bird tier is determined at TIME OF REGISTRATION — lock it in `pricing_tier`
- Forex rate is LIVE — never fixed — fetched at invoice generation from exchangerate-api
- Institution registrations have NO payment flow — confirmation only
- The two registration forms are completely independent pages
- Admin dashboard shows both in separate tabs
- Do NOT rebuild v2 — only add what's listed in this document
