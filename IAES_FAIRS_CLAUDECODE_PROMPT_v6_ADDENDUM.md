# IAES Fairs — Claude Code Prompt v6 (ADDENDUM TO V2–V5)
# Add AFTER v5 is complete.
# Do NOT rebuild anything from v1–v5.
# This addendum adds: Complete Fair Lifecycle Management — no gaps.

---

## THE COMPLETE LIFECYCLE

```
DRAFT → PUBLISHED → REGISTRATION_CLOSED → ONGOING → COMPLETED → ARCHIVED
                                                    ↘ CANCELLED (from any state)
```

Every transition is triggered by an admin action or an automatic date-based rule.

---

## 1. DATABASE CHANGES

### 1A. Update `fairs` Table — Add Lifecycle Fields

```sql
ALTER TABLE fairs
  ADD COLUMN status TEXT DEFAULT 'DRAFT'
    CHECK (status IN (
      'DRAFT',
      'PUBLISHED',
      'REGISTRATION_CLOSED',
      'ONGOING',
      'COMPLETED',
      'ARCHIVED',
      'CANCELLED'
    )),
  ADD COLUMN announced_at TIMESTAMPTZ,       -- when announcement email was sent
  ADD COLUMN registration_closed_at TIMESTAMPTZ,
  ADD COLUMN started_at TIMESTAMPTZ,         -- when admin clicked Start Fair
  ADD COLUMN concluded_at TIMESTAMPTZ,       -- when admin clicked Conclude Fair
  ADD COLUMN cancelled_at TIMESTAMPTZ,
  ADD COLUMN cancellation_reason TEXT,
  ADD COLUMN postfair_data_sent_at TIMESTAMPTZ,
  ADD COLUMN itinerary_sent_at TIMESTAMPTZ;

-- Update existing fair record
UPDATE fairs SET status = 'PUBLISHED' WHERE is_active = true;
UPDATE fairs SET status = 'DRAFT' WHERE is_active = false;
```

### 1B. New Table: `fair_status_log`

Every status change is recorded. Immutable audit trail.

```sql
CREATE TABLE fair_status_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,        -- admin email
  note TEXT,                       -- optional admin note
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON fair_status_log(fair_id);
CREATE INDEX ON fair_status_log(changed_at);
```

### 1C. New Table: `announcement_recipients`

Mailing list for fair announcements.

```sql
CREATE TABLE announcement_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  organization TEXT,
  source TEXT DEFAULT 'MANUAL'
    CHECK (source IN (
      'PAST_PARTICIPANT',    -- auto-added from previous registrations
      'MANUAL',             -- admin manually added
      'CSV_UPLOAD',         -- added via CSV upload
      'NEWSLETTER'          -- from IAES newsletter signup
    )),
  is_active BOOLEAN DEFAULT true,  -- false = unsubscribed
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX ON announcement_recipients(is_active);
CREATE INDEX ON announcement_recipients(source);
```

### 1D. New Table: `announcement_sends`

Tracks every email send per fair per recipient.

```sql
CREATE TABLE announcement_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES announcement_recipients(id) NOT NULL,
  email_type TEXT NOT NULL
    CHECK (email_type IN (
      'ANNOUNCEMENT',           -- initial fair launch email
      'EARLYBIRD_REMINDER',     -- 7 days before early bird ends
      'REGISTRATION_REMINDER',  -- 14 days before registration closes
      'ITINERARY',              -- 4 weeks before fair — briefing pack
      'PAYMENT_REMINDER',       -- to unpaid registrations only
      'POSTFAIR_DATA',          -- after fair concludes
      'CANCELLATION'            -- if fair is cancelled
    )),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  resend_email_id TEXT,         -- Resend's message ID for tracking
  UNIQUE(fair_id, recipient_id, email_type)
  -- prevent duplicate sends of same type to same person per fair
);

CREATE INDEX ON announcement_sends(fair_id);
CREATE INDEX ON announcement_sends(recipient_id);
```

---

## 2. NEW ADMIN PAGES — Full Structure

```
/admin/
├── dashboard/                    → (existing — registrations, institutions, fair day)
├── fairs/
│   ├── page.tsx                  → All fairs list
│   ├── new/
│   │   └── page.tsx              → Create new fair
│   └── [fairId]/
│       ├── page.tsx              → Fair control panel (main hub)
│       ├── edit/
│       │   └── page.tsx          → Edit fair details
│       ├── mailing-list/
│       │   └── page.tsx          → Manage announcement recipients
│       ├── announce/
│       │   └── page.tsx          → Compose + send announcement email
│       ├── reminders/
│       │   └── page.tsx          → Send pre-fair reminders
│       └── postfair/
│           └── page.tsx          → Post-fair data sharing
```

---

## 3. PAGE: `/admin/fairs` — All Fairs List

Simple table of all fairs ever created.

```
┌────────────────────────────────────────────────────────────────┐
│  IAES Admin — Fairs                          [+ Create Fair]   │
│                                                                │
│  Fair Name          Dates           Status    Registered  Rev  │
│  ─────────────────────────────────────────────────────────     │
│  Fair 2026 Aug      6–8 Aug 2026   ● ONGOING  18          $27K │
│  Fair 2025 Nov      15 Nov 2025    ✓ COMPLETED 24         $34K │
│  Fair 2024 Oct      12 Oct 2024    ✓ ARCHIVED  19         $28K │
└────────────────────────────────────────────────────────────────┘
```

Status dot colours:
- DRAFT → gray
- PUBLISHED → blue
- REGISTRATION_CLOSED → yellow
- ONGOING → green (pulsing)
- COMPLETED → teal
- ARCHIVED → gray
- CANCELLED → red

---

## 4. PAGE: `/admin/fairs/new` — Create Fair

Admin fills this form to create a fair from scratch (status = DRAFT).

```
SECTION 1: BASIC DETAILS
  Fair Name*                  text
  City*                       text (default: Ahmedabad)
  Venue*                      text
  Description*                textarea

SECTION 2: DATES
  Fair Start Date*            date picker
  Fair End Date*              date picker
  Arrive By (Recommended)*   date picker
  Depart After (Recommended) date picker
  Registration Deadline*      date picker
  Early Bird Deadline         date picker

SECTION 3: PRICING
  Standard Price (USD)*       number
  Standard Price (INR)*       number (auto-calc: USD × 95, editable)
  Early Bird Price (USD)      number
  Early Bird Price (INR)      number (auto-calc, editable)
  Max Universities            number (default: 30)
  Second Table Price (USD)    number (default: 2000)

SECTION 4: WHAT'S INCLUDED
  + Add Item button           (array of text fields)
  Default items pre-filled:
  - "Travel to institute visits by cabs arranged by IAES"
  - "Logistics and lunch during all days"

SECTION 5: CITIES FOR INSTITUTIONAL VISITS
  + Add City button           (array: city name + institution name)
  e.g. Ahmedabad, Changa (CHARUSAT), Vadodara (MSU)

[Save as Draft]   [Save & Preview]
```

On save → inserts into `fairs` with `status = 'DRAFT'`, `is_active = false`.
Logs to `fair_status_log`: `from_status: null, to_status: 'DRAFT'`.

---

## 5. PAGE: `/admin/fairs/[fairId]` — Fair Control Panel

This is the main hub for managing one fair. All lifecycle actions live here.

```
┌─────────────────────────────────────────────────────────────┐
│  IAES Education Fair — August 2026              [● DRAFT]   │
│  6–8 August 2026 · Ahmedabad                                │
│  Created: 14 May 2026                                       │
│                                                             │
│  [Edit Details]  [Preview Public Page ↗]                    │
│                                                             │
│  ── STATS ────────────────────────────────────────────────  │
│  Registrations: 0  |  Revenue: $0  |  Students: 0          │
│                                                             │
│  ── LIFECYCLE ────────────────────────────────────────────  │
│                                                             │
│  STEP 1: BUILD                                              │
│  ✅ Fair details saved                                       │
│  ✅ Pricing set: USD 1,700 / Early Bird USD 1,500           │
│  ✅ T&C version 2026.1                                      │
│  [ Edit Details → ]                                         │
│                                                             │
│  STEP 2: PUBLISH                         [PUBLISH FAIR →]   │
│  Makes the fair page live at                                │
│  fairs.iaesgujarat.org                                      │
│                                                             │
│  STEP 3: ANNOUNCE                                           │
│  Send launch email to mailing list                          │
│  Recipients: 47 contacts                                    │
│  [ Manage Mailing List ]  [ Send Announcement → ]          │
│                                                             │
│  STEP 4: PRE-FAIR REMINDERS                                 │
│  [ Send Early Bird Reminder ]   Due: 7 days before Jun 15   │
│  [ Send Reg Deadline Reminder ] Due: 14 days before Jul 5   │
│  [ Send Itinerary & Briefing ]  Due: 4 weeks before Aug 6   │
│  [ Send Payment Reminders ]     To: 3 unpaid registrations  │
│                                                             │
│  STEP 5: START FAIR              [▶ START FAIR]             │
│  Activates QR scanning. Enable on 6 Aug 2026.              │
│                                                             │
│  STEP 6: CONCLUDE FAIR           [✓ CONCLUDE FAIR]          │
│  Locks registrations. Enables post-fair data.               │
│                                                             │
│  STEP 7: SHARE POST-FAIR DATA    [📊 SEND DATA]             │
│  Send each university their scanned student list.           │
│                                                             │
│  STEP 8: ARCHIVE                 [Archive Fair]             │
│  Move to historical records.                                │
│                                                             │
│  ── DANGER ZONE ─────────────────────────────────────────  │
│  [ Cancel Fair ]  ← requires confirmation + reason text     │
│                                                             │
│  ── STATUS HISTORY ──────────────────────────────────────  │
│  14 May 2026 10:00am  Created as DRAFT  (jaydeep@iaes)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. API ROUTES — All Lifecycle Transitions

### `POST /api/admin/fairs` — Create Fair
```typescript
// Inserts into fairs (status: DRAFT, is_active: false)
// Logs to fair_status_log
// Returns { fairId }
```

### `PUT /api/admin/fairs/[fairId]` — Update Fair Details
```typescript
// Updates fairs table
// Only allowed when status is DRAFT or PUBLISHED
// Returns { success: true }
```

### `POST /api/admin/fairs/[fairId]/publish` — DRAFT → PUBLISHED
```typescript
// Guards:
// - Fair must be in DRAFT status
// - Must have: name, venue, fair_date_start, fair_date_end,
//   registration_deadline, price_standard_usd, price_standard_inr

// Actions:
// 1. Update fairs: status = 'PUBLISHED', is_active = true
// 2. Log to fair_status_log
// 3. Return { success: true }
```

### `POST /api/admin/fairs/[fairId]/close-registration` — PUBLISHED → REGISTRATION_CLOSED
```typescript
// Triggered: automatically when registration_deadline passes (cron)
//            OR manually by admin

// Actions:
// 1. Update fairs: status = 'REGISTRATION_CLOSED',
//                 registration_closed_at = NOW()
// 2. Log to fair_status_log
// 3. Return { success: true }
```

### `POST /api/admin/fairs/[fairId]/start` — REGISTRATION_CLOSED → ONGOING
```typescript
// Guards:
// - Fair must be PUBLISHED or REGISTRATION_CLOSED
// - Confirm dialog: "This will activate QR scanning. Are you sure?"

// Actions:
// 1. Update fairs: status = 'ONGOING', started_at = NOW()
// 2. is_active remains true
// 3. Log to fair_status_log
// 4. Return { success: true }
```

### `POST /api/admin/fairs/[fairId]/conclude` — ONGOING → COMPLETED
```typescript
// Guards:
// - Fair must be ONGOING
// - Confirm dialog: "This will lock all registrations and enable
//   post-fair data export. Are you sure?"

// Actions:
// 1. Update fairs: status = 'COMPLETED', concluded_at = NOW()
// 2. is_active = false (fair page shows "This fair has concluded")
// 3. Log to fair_status_log
// 4. Auto-compile post-fair stats (cache in fair record)
// 5. Return { success: true }
```

### `POST /api/admin/fairs/[fairId]/archive` — COMPLETED → ARCHIVED
```typescript
// Actions:
// 1. Update fairs: status = 'ARCHIVED'
// 2. Log to fair_status_log
```

### `POST /api/admin/fairs/[fairId]/cancel` — ANY → CANCELLED
```typescript
// Body: { reason: string } — required
// Guards: reason must be non-empty

// Actions:
// 1. Update fairs: status = 'CANCELLED', is_active = false,
//                 cancelled_at = NOW(), cancellation_reason = reason
// 2. Log to fair_status_log
// 3. Trigger cancellation emails to all confirmed registrations
// 4. Return { success: true }
```

---

## 7. CRON JOBS — Automatic Status Transitions

Add these cron jobs to Supabase (pg_cron):

```sql
-- Job 1: Auto-close registration when deadline passes
-- Runs daily at midnight IST (6:30pm UTC)
SELECT cron.schedule(
  'auto-close-registration',
  '30 18 * * *',
  $$
  UPDATE fairs
  SET status = 'REGISTRATION_CLOSED',
      registration_closed_at = NOW()
  WHERE status = 'PUBLISHED'
    AND registration_deadline < CURRENT_DATE;
  $$
);

-- Job 2: Auto-send early bird reminder (7 days before deadline)
-- Runs daily — triggers announcement_sends insert
-- Handled in Next.js API route called by Supabase cron webhook

-- Job 3: Auto-send registration deadline reminder (14 days before)
-- Same pattern as above
```

---

## 8. EMAIL TEMPLATES — All 7 Types

### Email 1: `ANNOUNCEMENT` — Fair Launch

```
Subject: 🎓 IAES Education Fair 2026 — Registration Now Open

Dear [Name],

We are pleased to announce the IAES U.S. University Education
Outreach Tour & Fair, August 2026.

📅 Dates:    6–8 August 2026
📍 City:     Ahmedabad, Gujarat
🏫 Visits:   Ahmedabad · Changa · Vadodara

REGISTRATION FEE:
⭐ Early Bird (before 15 June): USD 1,500
   Standard: USD 1,700

Cost includes travel, logistics, and meals during all visits.

Registration closes: 5 July 2026

[REGISTER NOW →]

Limited to 30 universities. Secure your spot today.

IAES Team
```

### Email 2: `EARLYBIRD_REMINDER` — 7 Days Before Early Bird Ends

```
Subject: ⏰ Early Bird Ends in 7 Days — IAES Fair 2026

Dear [Name],

The Early Bird rate of USD 1,500 for the IAES Education Fair 2026
ends on [earlybird_deadline].

After this date, the standard rate of USD 1,700 applies.

[REGISTER AT EARLY BIRD RATE →]

IAES Team
```

### Email 3: `REGISTRATION_REMINDER` — 14 Days Before Deadline

```
Subject: 📌 Registration Closes in 14 Days — IAES Fair 2026

Dear [Name],

This is a reminder that registration for the IAES Education Fair 2026
closes on [registration_deadline].

[Spots remaining: X of 30]

[REGISTER NOW →]

IAES Team
```

### Email 4: `ITINERARY` — 4 Weeks Before Fair (to confirmed registrations)

```
Subject: 📋 Fair Briefing & Itinerary — IAES Education Fair 2026

Dear [Rep Name] from [University Name],

We are excited to welcome you to the IAES Education Fair 2026.
Please find below your confirmed briefing pack.

YOUR BOOKING:
  Invoice:   IAES-FAIR-2026-001
  Booth:     Standard (1 counter, 2 reps)
  Fair Dates: 6–8 August 2026

ITINERARY HIGHLIGHTS:
  5 Aug (Wed): Arrive Ahmedabad by EOD
  6 Aug (Thu): [Institution visits — Changa]
  7 Aug (Fri): [Institution visits — Vadodara]
  8 Aug (Sat): Open Fair at Ahmedabad venue
  9 Aug (Sun): Depart

BOARDING POINT: [Address — TBC 1 week before]
PICKUP TIME: 8:00 AM sharp

MATERIALS SHIPPING:
  Ship to: [IAES address]
  Deadline: 1 August 2026
  Label: "IAES FAIR 2026 — [University Name]"

For questions: eduadviser@iaesgujarat.org | +91 9825593262

See you in Ahmedabad!
IAES Team
```

### Email 5: `PAYMENT_REMINDER` — To Unpaid Registrations

```
Subject: ⚠️ Payment Pending — IAES Fair 2026 Registration

Dear [Rep Name],

Your registration for the IAES Education Fair 2026 is pending payment.

Invoice:   IAES-FAIR-2026-001
Amount:    [USD 1,500 / ₹X,XX,XXX]
Due Date:  [due_date]

[PAY NOW →]

If payment is not received by [due_date + 7 days], your
registration may be released to another institution.

IAES Team
```

### Email 6: `POSTFAIR_DATA` — After Fair Concludes (to each university)

```
Subject: 📊 Your IAES Fair 2026 Student Data — [University Name]

Dear [Rep Name],

Thank you for participating in the IAES Education Fair 2026.
Here is a summary of your booth engagement:

  Students who visited your booth:  [count]
  Students marked as Interested:    [count]
  Fair dates:                        6–8 August 2026

Your complete student contact list (with consent) is attached
as a CSV file.

This data is available on your portal for 30 days:
[VIEW ON PORTAL →]

Please use this data only for legitimate admissions and
advisory communications, as per our Terms & Conditions.

Thank you for being part of IAES Fair 2026.

IAES Team
```

### Email 7: `CANCELLATION` — If Fair is Cancelled

```
Subject: Important Notice — IAES Fair 2026 Cancellation

Dear [Rep Name],

We regret to inform you that the IAES Education Fair 2026
has been cancelled due to: [cancellation_reason]

Your registration fee will be refunded as per our
cancellation policy. Please expect:

  Refund Amount: [calculated per T&C clause 9.3]
  Timeline:      Within 30 business days
  Method:        Original payment method

We sincerely apologise for the inconvenience.

For queries: eduadviser@iaesgujarat.org | +91 9825593262

IAES Team
```

---

## 9. PAGE: `/admin/fairs/[fairId]/mailing-list`

Admin manages who receives fair announcements.

```
┌──────────────────────────────────────────────────────────┐
│  Mailing List — IAES Fair 2026         [+ Add Contact]   │
│                                        [Upload CSV]       │
│                                        [Import from Past] │
│                                                          │
│  Total: 47 active contacts                               │
│                                                          │
│  Filter: All | Past Participants | Manual | CSV Upload   │
│                                                          │
│  Name              Email              Source    Status   │
│  ─────────────────────────────────────────────────────   │
│  John Smith        j@asu.edu         Past Part  Active   │
│  Sarah Lee         s@nyu.edu         Manual     Active   │
│  ...               ...               ...        ...      │
│                                                          │
│  [Remove]  next to each row                             │
└──────────────────────────────────────────────────────────┘
```

**"Import from Past"** button:
- Queries all unique `contact_email` values from `registrations`
- Inserts into `announcement_recipients` with `source = 'PAST_PARTICIPANT'`
- Skips duplicates (UNIQUE constraint on email)
- Shows: "47 contacts imported. 3 already existed."

**CSV Upload format:**
```csv
name,email,organization
John Smith,j@asu.edu,Arizona State University
```

---

## 10. PAGE: `/admin/fairs/[fairId]/announce`

Compose and send the announcement email.

```
┌──────────────────────────────────────────────────────────┐
│  Send Announcement — IAES Fair 2026                      │
│                                                          │
│  Recipients: 47 active contacts                          │
│  Already announced: No                                   │
│                                                          │
│  EMAIL PREVIEW:                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Subject: 🎓 IAES Education Fair 2026 — Open Now   │  │
│  │ [Full email preview rendered here]                 │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ⚠️  This will send emails to 47 contacts.               │
│  This action cannot be undone.                           │
│                                                          │
│  [Send Test to me first]   [SEND ANNOUNCEMENT →]        │
└──────────────────────────────────────────────────────────┘
```

On send:
1. Loop through all active `announcement_recipients`
2. Send via Resend
3. Insert into `announcement_sends` per recipient
4. Update `fairs.announced_at = NOW()`
5. Show progress: "Sending... 12/47"

**"Send Test" button:** Sends only to `eduadviser@iaesgujarat.org` first.

---

## 11. PAGE: `/admin/fairs/[fairId]/reminders`

Pre-fair reminders management.

```
┌──────────────────────────────────────────────────────────┐
│  Pre-Fair Reminders — IAES Fair 2026                     │
│                                                          │
│  ① EARLY BIRD REMINDER                                   │
│  Send 7 days before early bird ends: 8 June 2026        │
│  Recipients: All announcement contacts                   │
│  Status: Not sent                                        │
│  [Send Now]  [Schedule for 8 Jun]                        │
│                                                          │
│  ② REGISTRATION DEADLINE REMINDER                        │
│  Send 14 days before deadline: 21 June 2026             │
│  Recipients: All announcement contacts                   │
│  Status: Not sent                                        │
│  [Send Now]  [Schedule for 21 Jun]                       │
│                                                          │
│  ③ ITINERARY & BRIEFING PACK                             │
│  Send 4 weeks before fair: 9 July 2026                  │
│  Recipients: Confirmed registrations only (18)           │
│  Status: Not sent                                        │
│  [Send Now]  [Schedule for 9 Jul]                        │
│                                                          │
│  ④ PAYMENT REMINDERS                                     │
│  Recipients: Unpaid registrations (3)                    │
│  Status: Not sent                                        │
│  [Send Payment Reminders Now]                            │
└──────────────────────────────────────────────────────────┘
```

---

## 12. PAGE: `/admin/fairs/[fairId]/postfair`

Post-fair data sharing. Only accessible when `status = 'COMPLETED'`.

```
┌──────────────────────────────────────────────────────────┐
│  Post-Fair Data — IAES Fair 2026                         │
│  Concluded: 8 August 2026                                │
│                                                          │
│  SUMMARY                                                 │
│  Total Students Registered:   1,204                      │
│  Total Check-ins:             987 (82%)                  │
│  Total Booth Scans:           3,421                      │
│  Universities Participated:   18                         │
│                                                          │
│  DATA SHARING STATUS                                     │
│                                                          │
│  University          Scans  Interested  Data Sent        │
│  ─────────────────────────────────────────────────────   │
│  Arizona State       47     12          ✅ 9 Aug 10am    │
│  NYU                 38     9           ✅ 9 Aug 10am    │
│  Boston University   31     7           ⏳ Not sent      │
│  ...                                                     │
│                                                          │
│  [Send to All Remaining →]                              │
│  [Download Master Report CSV]                            │
│  [Download GST Summary for CA]                          │
└──────────────────────────────────────────────────────────┘
```

**"Send to All Remaining":**
- For each confirmed university registration
- Generates CSV of their `fair_scans` + student profiles (consent-filtered)
- Attaches CSV to `POSTFAIR_DATA` email
- Sends via Resend
- Updates `announcement_sends` and `fairs.postfair_data_sent_at`

**CSV format per university:**
```csv
pass_number,full_name,institution,course,semester,field_of_interest,
budget_range,preferred_countries,english_exam,email,phone,rep_notes,
interested,scanned_at

FAIR-2026-0042,Rahul Sharma,Gujarat University,B.Tech CS,3rd Year,
"Computer Science, Data Science",₹30-50L,USA,IELTS 6.5,
rahul@email.com,+91-98765,Interested in MS CS,true,2026-08-07 11:23am
```

Note: `email` and `phone` only included if respective consents are true.

---

## 13. NEW PAGE: `/portal/[universityRegistrationId]/students`

University reps can view their scanned students online (30-day access after fair).

```
┌──────────────────────────────────────────────────────────┐
│  [IAES LOGO]  Your Student Leads — IAES Fair 2026        │
│  Arizona State University                                │
│  Access expires: 8 September 2026                        │
│                                                          │
│  47 students visited your booth                          │
│  12 marked as Interested                                 │
│                                                          │
│  Filter: All | Interested Only                           │
│  [Download CSV]                                          │
│                                                          │
│  Rahul Sharma          Gujarat Uni · CS · 3rd Yr         │
│  ★ Interested          IELTS 6.5 · Budget ₹30-50L        │
│  rahul@email.com       +91 98765 43210                   │
│  Note: "Very keen on MS CS. Follow up."                  │
│                                                          │
│  ── next student ──                                      │
└──────────────────────────────────────────────────────────┘
```

Access control:
- URL contains `universityRegistrationId` (UUID)
- No login required — UUID is the access token
- Check `fair.concluded_at` — deny access if more than 30 days have passed
- Show `data_sharing_consent = true` students only

---

## 14. PUBLIC PAGE: `/` — Fair Status Aware

Update `app/page.tsx` to handle all fair statuses gracefully:

```typescript
// In page.tsx — handle each status

switch (fair.status) {
  case 'DRAFT':
    // Should not be reachable publicly (is_active = false)
    return <ComingSoonPage />

  case 'PUBLISHED':
    // Normal landing page with registration CTAs
    return <FairLandingPage fair={fair} showRegistration={true} />

  case 'REGISTRATION_CLOSED':
    // Show fair details but replace CTA with:
    // "Registration has closed. Thank you for your interest."
    return <FairLandingPage fair={fair} showRegistration={false}
             message="Registration closed on [date]." />

  case 'ONGOING':
    // Show "Fair is happening now!" banner
    // Replace university CTA with student QR scanner link
    return <FairLandingPage fair={fair} showRegistration={false}
             showOngoingBanner={true} />

  case 'COMPLETED':
    // Show "This fair has concluded" with stats
    return <FairCompletedPage fair={fair} />

  case 'CANCELLED':
    // Show cancellation notice
    return <FairCancelledPage fair={fair} />

  default:
    return <FairLandingPage fair={fair} showRegistration={true} />
}
```

---

## 15. TYPES — Add to `types/index.ts`

```typescript
export type FairStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'REGISTRATION_CLOSED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'CANCELLED';

// Update Fair interface:
export interface Fair {
  // ... existing fields ...
  status: FairStatus;
  announced_at: string | null;
  registration_closed_at: string | null;
  started_at: string | null;
  concluded_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  postfair_data_sent_at: string | null;
  itinerary_sent_at: string | null;
}

export interface FairStatusLog {
  id: string;
  fair_id: string;
  from_status: FairStatus | null;
  to_status: FairStatus;
  changed_by: string;
  note: string | null;
  changed_at: string;
}

export interface AnnouncementRecipient {
  id: string;
  email: string;
  name: string | null;
  organization: string | null;
  source: 'PAST_PARTICIPANT' | 'MANUAL' | 'CSV_UPLOAD' | 'NEWSLETTER';
  is_active: boolean;
  unsubscribed_at: string | null;
  created_at: string;
}
```

---

## BUILD ORDER FOR V6 (run after v5 is complete)

1.  SQL: `ALTER TABLE fairs` — add lifecycle columns
2.  SQL: Create `fair_status_log` table
3.  SQL: Create `announcement_recipients` table
4.  SQL: Create `announcement_sends` table
5.  SQL: Set up pg_cron jobs for auto-close-registration
6.  Update `types/index.ts` — FairStatus, Fair, FairStatusLog, AnnouncementRecipient
7.  Create all lifecycle API routes:
    - `POST /api/admin/fairs` (create)
    - `PUT /api/admin/fairs/[fairId]` (edit)
    - `POST /api/admin/fairs/[fairId]/publish`
    - `POST /api/admin/fairs/[fairId]/close-registration`
    - `POST /api/admin/fairs/[fairId]/start`
    - `POST /api/admin/fairs/[fairId]/conclude`
    - `POST /api/admin/fairs/[fairId]/archive`
    - `POST /api/admin/fairs/[fairId]/cancel`
8.  Create all announcement API routes:
    - `POST /api/admin/fairs/[fairId]/announce`
    - `POST /api/admin/fairs/[fairId]/remind`
    - `POST /api/admin/fairs/[fairId]/postfair-data`
    - `GET /api/admin/fairs/[fairId]/mailing-list`
    - `POST /api/admin/fairs/[fairId]/mailing-list/import-past`
    - `POST /api/admin/fairs/[fairId]/mailing-list/upload-csv`
9.  Create all 7 email templates in `emails/`
10. Create `app/admin/fairs/page.tsx` — all fairs list
11. Create `app/admin/fairs/new/page.tsx` — create fair form
12. Create `app/admin/fairs/[fairId]/page.tsx` — fair control panel
13. Create `app/admin/fairs/[fairId]/edit/page.tsx`
14. Create `app/admin/fairs/[fairId]/mailing-list/page.tsx`
15. Create `app/admin/fairs/[fairId]/announce/page.tsx`
16. Create `app/admin/fairs/[fairId]/reminders/page.tsx`
17. Create `app/admin/fairs/[fairId]/postfair/page.tsx`
18. Create `app/portal/[universityRegistrationId]/students/page.tsx`
19. Update `app/page.tsx` — status-aware rendering
20. Update `app/admin/dashboard/page.tsx` — add link to /admin/fairs

---

## CRITICAL RULES FOR V6

- Status transitions are ONE-WAY — no going back (except CANCELLED from anywhere)
- Every status change MUST be logged to `fair_status_log`
- Admin must confirm (dialog box) before: Publish, Start, Conclude, Cancel
- Cancel requires a written reason — stored in `cancellation_reason`
- Announcement emails check `announcement_sends` UNIQUE constraint — no duplicates
- "Send Test" always sends only to `eduadviser@iaesgujarat.org`
- Post-fair data CSV respects consent flags — never expose phone/email without consent
- Portal access for universities expires 30 days after `fair.concluded_at`
- pg_cron auto-close only runs if `registration_deadline < CURRENT_DATE`
- `is_active` on `fairs` table controls public visibility:
  PUBLISHED/REGISTRATION_CLOSED/ONGOING = true | all others = false
- Do NOT rebuild anything from v1–v5
