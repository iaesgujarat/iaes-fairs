# IAES Fairs — Claude Code Prompt v4 (ADDENDUM TO V2 + V3)
# Add AFTER v3 is complete.
# Do NOT rebuild anything from v1, v2, or v3.
# This addendum adds: Student Pass, QR Code, Scanner, Scan Profile.

---

## NEW DEPENDENCIES — Install First

```bash
npm install react-qr-code
npm install html5-qrcode
```

---

## NEW TABLE 1: `fair_student_passes`

Run in Supabase SQL editor:

```sql
CREATE TABLE fair_student_passes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pass_uuid UUID UNIQUE DEFAULT gen_random_uuid(),  -- encoded in QR
  fair_id UUID REFERENCES fairs(id) NOT NULL,

  -- Link to institution registration (null if student self-registered)
  institution_registration_id UUID
    REFERENCES institution_registrations(id)
    ON DELETE SET NULL,

  -- Student Identity
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Academic Profile
  institution_name TEXT NOT NULL,
  current_course TEXT,
  current_semester TEXT,
  english_exam TEXT,              -- e.g. "IELTS 6.5" or "Not attempted"

  -- Interest Profile
  field_of_interest TEXT[] DEFAULT '{}',
  budget_range TEXT,
  preferred_countries TEXT[] DEFAULT '{}',

  -- Consents
  whatsapp_consent BOOLEAN DEFAULT false,
  email_consent BOOLEAN DEFAULT true,
  data_sharing_consent BOOLEAN DEFAULT false,

  -- Fair Day
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,

  -- Pass display
  pass_number TEXT UNIQUE,        -- e.g. FAIR-2026-0042 (generated on insert)

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(email, fair_id)          -- one pass per student per fair
);

-- Auto-generate pass_number on insert
CREATE SEQUENCE pass_counter START 1;

CREATE OR REPLACE FUNCTION generate_pass_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.pass_number := 'FAIR-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                     LPAD(nextval('pass_counter')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_pass_number
  BEFORE INSERT ON fair_student_passes
  FOR EACH ROW
  EXECUTE FUNCTION generate_pass_number();
```

---

## NEW TABLE 2: `fair_scans`

```sql
CREATE TABLE fair_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pass_uuid UUID REFERENCES fair_student_passes(pass_uuid) NOT NULL,
  fair_id UUID REFERENCES fairs(id) NOT NULL,

  -- Which university scanned this student
  university_registration_id UUID REFERENCES registrations(id) NOT NULL,

  -- Rep action after scan
  rep_notes TEXT,
  interested BOOLEAN DEFAULT false,  -- rep marked student as interested

  scanned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate scans by same university
  UNIQUE(pass_uuid, university_registration_id)
);
```

---

## NEW FOLDER STRUCTURE (additions only)

```
app/
├── student/
│   └── page.tsx                  # Student self-registration form
├── pass/
│   └── [passUuid]/
│       └── page.tsx              # Student's digital QR pass (mobile)
├── scan/
│   ├── page.tsx                  # University rep camera scanner
│   └── [passUuid]/
│       └── page.tsx              # Student profile shown after scan
└── api/
    ├── student/
    │   └── register/
    │       └── route.ts          # POST: student registration + pass creation
    ├── scan/
    │   └── [passUuid]/
    │       └── route.ts          # GET: fetch student data for rep view
    └── scan/
        └── save/
            └── route.ts          # POST: save scan record (rep saved contact)

components/
├── StudentPassCard.tsx            # The QR pass display component
├── QRScanner.tsx                  # Camera scanner component (html5-qrcode)
└── StudentProfile.tsx             # Profile shown to rep after scan

emails/
└── StudentPassEmail.tsx           # QR pass email to student
```

---

## PAGE 1: `/student` — Student Registration Form

**Design:** Mobile-first. Clean. Fast to fill. Navy + Gold brand.
Single page form (no multi-step — keep it quick for students).

```
Header: IAES Education Fair 2026 logo + "Get Your Free Pass"

Fields:

Full Name*                    text
Email Address*                email
Phone / WhatsApp*             text (show +91 prefix)
Institution Name*             text (their college/school)

Current Course*               dropdown:
                              Science (PCM / PCB)
                              Commerce
                              Arts / Humanities
                              Engineering (BE/BTech)
                              Management (BBA/MBA)
                              Law | Medicine | Other

Current Semester / Year*      dropdown:
                              Std 11 | Std 12
                              1st Year | 2nd Year
                              3rd Year | 4th Year
                              Postgraduate

Field of Interest in USA*     multi-select (checkboxes):
                              Computer Science / IT
                              Engineering
                              Business / Management
                              Health Sciences
                              Arts & Design
                              Social Sciences | Law | Other

Budget Range                  dropdown:
                              Under ₹30 Lakhs/year
                              ₹30–50 Lakhs/year
                              ₹50–80 Lakhs/year
                              Above ₹80 Lakhs/year
                              Open / Scholarship seeking

English Exam                  text (placeholder: "IELTS 6.5" or "Not attempted")

Preferred Countries           multi-select:
                              USA | Canada | UK
                              Australia | Germany | Other

Consents:
□ Send me WhatsApp updates about the fair
☑ Send me email updates
□ I agree to share my profile with participating US universities
```

**Submit button:** "Get My Pass →"

**On Submit:**
1. POST to `/api/student/register`
2. API creates `fair_student_passes` record (triggers `pass_number` auto-generate)
3. Sends QR pass email via Resend
4. Redirects to `/pass/[passUuid]`

**Validation:**
- Email uniqueness per fair (one pass per student)
- If duplicate email: show message "A pass was already issued to this email."
  with link "Resend my pass →" that re-sends the email.

---

## API: `/api/student/register`

```typescript
// POST /api/student/register
// Body: all form fields + fair_id

// 1. Check if email already registered for this fair
//    → If yes: resend email, return { alreadyRegistered: true, passUuid }
// 2. Insert into fair_student_passes
//    → pass_uuid and pass_number auto-generated by DB
// 3. Send StudentPassEmail via Resend with QR image
// 4. Return { passUuid, passNumber }
```

---

## PAGE 2: `/pass/[passUuid]` — Student's Digital QR Pass

**This is the page students show at the venue.**

**Critical requirements:**
- Must work on mobile screen (375px wide)
- No login required — publicly accessible by UUID
- Loads fast — student may have poor venue WiFi
- Add `<meta name="robots" content="noindex">` (don't index in Google)

**Layout:**

```
┌────────────────────────────────┐
│  [IAES LOGO]                   │
│  EDUCATION FAIR 2026           │
│  6–8 August · Ahmedabad        │
│                                │
│  ┌──────────────────────────┐  │
│  │                          │  │
│  │   [QR CODE — 240×240]    │  │
│  │                          │  │
│  └──────────────────────────┘  │
│                                │
│  Rahul Sharma                  │
│  Gujarat University            │
│  B.Tech · Computer Sci · 3rd   │
│                                │
│  Pass No: FAIR-2026-0042       │
│                                │
│  ── Show this to university ── │
│  ──── reps at each booth ───── │
└────────────────────────────────┘
```

**Implementation:**

```typescript
// app/pass/[passUuid]/page.tsx

import QRCode from "react-qr-code";

// Fetch pass data server-side
const pass = await supabase
  .from("fair_student_passes")
  .select("*, fairs(*)")
  .eq("pass_uuid", params.passUuid)
  .single();

if (!pass) notFound();

// QR encodes the SCAN URL — not the pass URL
const scanUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scan/${pass.pass_uuid}`;

// Render:
<QRCode
  value={scanUrl}
  size={240}
  bgColor="#FFFFFF"
  fgColor="#0B2B5C"   // navy
/>
```

**If pass not found:** Show "Pass not found. Please register at /student"

---

## PAGE 3: `/scan` — University Rep Camera Scanner

**Who uses this:** University reps at their booth. They open this URL on their phone.
**No login required** — but university must have a confirmed registration.

**Design:** Full-screen camera viewfinder. Minimal UI.

```
┌────────────────────────────────┐
│  IAES FAIR 2026  📷 Scanner    │
│                                │
│  ┌──────────────────────────┐  │
│  │                          │  │
│  │                          │  │
│  │   [CAMERA VIEWFINDER]    │  │
│  │                          │  │
│  │   [  scanning box  ]     │  │
│  │                          │  │
│  └──────────────────────────┘  │
│                                │
│  Point at student's QR code    │
│                                │
│  ── or ──                      │
│                                │
│  Enter Pass ID manually:       │
│  [FAIR-2026-____] [Go]         │
└────────────────────────────────┘
```

**Implementation (`components/QRScanner.tsx`):**

```typescript
"use client";
import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useRouter } from "next/navigation";

export function QRScanner() {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const router = useRouter();

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        // decodedText is the full URL: https://fairs.../scan/[uuid]
        // Extract the UUID and navigate
        const parts = decodedText.split("/");
        const uuid = parts[parts.length - 1];
        scannerRef.current?.clear();
        router.push(`/scan/${uuid}`);
      },
      (error) => {
        // Scanning in progress — ignore frame errors
        console.debug("QR scan frame:", error);
      }
    );

    return () => {
      scannerRef.current?.clear().catch(console.error);
    };
  }, [router]);

  return <div id="qr-reader" className="w-full" />;
}
```

**Manual entry fallback:**
```typescript
// If rep types FAIR-2026-0042, look up pass_uuid by pass_number
// GET /api/scan/by-pass-number?number=FAIR-2026-0042
// → redirect to /scan/[passUuid]
```

---

## PAGE 4: `/scan/[passUuid]` — Student Profile for Rep

**What rep sees immediately after scan. Mobile optimised.**

```
┌────────────────────────────────┐
│  ← Scan Another               │
│                                │
│  Rahul Sharma                  │
│  Gujarat University            │
│  B.Tech · Computer Sci · 3rd Yr│
│                                │
│  📱 +91 98765 43210            │  ← only if whatsapp_consent = true
│  ✉  rahul@email.com            │
│                                │
│  Interested In:                │
│  🎯 Computer Science / IT      │
│  🎯 Data Science               │
│                                │
│  Budget: ₹30–50 Lakhs/year     │
│  Countries: USA, Canada        │
│  English: IELTS 6.5            │
│                                │
│  ┌──────────────────────────┐  │
│  │ Quick Note (optional)    │  │
│  │ [                      ] │  │
│  └──────────────────────────┘  │
│                                │
│  [★ Save Contact]              │
│                                │
│  Pass: FAIR-2026-0042          │
│  Scanned: 10:42 AM             │
└────────────────────────────────┘
```

**Privacy rule:** Show phone/WhatsApp ONLY if `whatsapp_consent = true`.
Show email ONLY if `email_consent = true`.
If neither consent: show "Student has not shared contact details."

**"Save Contact" button:**
- POST to `/api/scan/save`
- Body: `{ passUuid, universityRegistrationId, repNotes, interested }`
- Inserts into `fair_scans` table
- Button changes to "✓ Saved" (disabled) after save
- If already scanned by this university: show "✓ Already in your list"

**"Scan Another" link:** → `/scan`

---

## API: `/api/scan/[passUuid]` (GET)

```typescript
// GET /api/scan/[passUuid]
// Returns student profile for rep display
// Respects consent flags — strip phone if !whatsapp_consent

const pass = await supabase
  .from("fair_student_passes")
  .select(`
    pass_uuid, pass_number, full_name, institution_name,
    current_course, current_semester, english_exam,
    field_of_interest, budget_range, preferred_countries,
    whatsapp_consent, email_consent, data_sharing_consent,
    phone, email, checked_in, created_at,
    fairs(name, fair_date_start, fair_date_end, city)
  `)
  .eq("pass_uuid", params.passUuid)
  .single();

// Strip contact based on consent
if (!pass.data_sharing_consent) {
  return { error: "Student has not consented to data sharing" };
}
if (!pass.whatsapp_consent) delete pass.phone;
if (!pass.email_consent) delete pass.email;

return pass;
```

---

## API: `/api/scan/save` (POST)

```typescript
// POST /api/scan/save
// Body: { passUuid, universityRegistrationId, repNotes, interested }

// 1. Upsert into fair_scans (UNIQUE on passUuid + universityRegistrationId)
//    → If already exists: update rep_notes and interested only
// 2. Return { saved: true, alreadyScanned: boolean }
```

---

## EMAIL: Student QR Pass (`emails/StudentPassEmail.tsx`)

```
Subject: 🎟 Your Fair Pass — IAES Education Fair, August 2026

Dear [Full Name],

Your pass for the IAES U.S. University Education Fair is ready!

📅 6–8 August 2026
📍 Ahmedabad

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[QR CODE IMAGE — 200×200px]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pass ID: FAIR-2026-0042
Name:    [Full Name]
College: [Institution Name]

HOW TO USE:
1. Save this email or screenshot the QR code
2. Show it to university reps at each booth
3. They scan it to see your profile instantly

No app needed. Works on any phone.

See you at the fair!

IAES Team
Indo American Education Society, Ahmedabad
eduadviser@iaesgujarat.org | +91 9825593262
```

**Technical note:** Generate the QR as a PNG using the `qrcode` npm package
(not react-qr-code — that's for browser rendering).
Embed as base64 inline image in email so it shows without internet.

```bash
npm install qrcode
npm install @types/qrcode
```

```typescript
import QRCode from "qrcode";

const scanUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scan/${passUuid}`;
const qrDataUrl = await QRCode.toDataURL(scanUrl, {
  width: 200,
  margin: 2,
  color: { dark: "#0B2B5C", light: "#FFFFFF" },
});
// qrDataUrl is "data:image/png;base64,..."
// Pass to Resend email as <img src={qrDataUrl} />
```

---

## UPDATE: Admin Dashboard — Add Fair Day Tab

Add a third tab to the admin dashboard: **"Fair Day"**

```
[University Registrations]  [Institution Registrations]  [Fair Day]
```

**Fair Day tab shows:**

Summary cards:
```
Student Passes Issued | Checked In | Total Scans | Universities Scanning
```

Student passes table:
| Pass No | Name | Institution | Course | Checked In | Scans | |
| FAIR-2026-0001 | Rahul S. | GU | B.Tech | ✅ 10:42am | 4 | View |

Scans table (per university):
| University | Students Scanned | Interested | Last Scan |
| ASU | 23 | 8 | 11:30am |

**Export:** Full scan data as CSV (student + which universities showed interest)

---

## UPDATE: Landing Page — Add Student CTA

In `app/page.tsx`, add a third card below the dual university/institution cards:

```tsx
{/* Student Pass CTA */}
<div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-6 text-center">
  <p className="text-sm font-medium text-navy">
    🎓 Are you a student planning to attend?
  </p>
  <p className="mt-1 text-xs text-gray-500">
    Register for your free digital pass — show it at each university booth.
  </p>
  <Link
    href="/student"
    className="mt-4 inline-flex items-center gap-2 rounded-md border border-gold bg-white px-6 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-gold/10"
  >
    Get My Free Pass →
  </Link>
</div>
```

---

## TYPES — Add to `types/index.ts`

```typescript
export interface FairStudentPass {
  id: string;
  pass_uuid: string;
  pass_number: string;
  fair_id: string;
  institution_registration_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  institution_name: string;
  current_course: string | null;
  current_semester: string | null;
  english_exam: string | null;
  field_of_interest: string[];
  budget_range: string | null;
  preferred_countries: string[];
  whatsapp_consent: boolean;
  email_consent: boolean;
  data_sharing_consent: boolean;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
}

export interface FairScan {
  id: string;
  pass_uuid: string;
  fair_id: string;
  university_registration_id: string;
  rep_notes: string | null;
  interested: boolean;
  scanned_at: string;
}
```

---

## BUILD ORDER FOR V4 (run after v3 is complete)

1. Install new deps: `npm install react-qr-code html5-qrcode qrcode @types/qrcode`
2. Run SQL: `fair_student_passes` table + trigger
3. Run SQL: `fair_scans` table
4. Add types to `types/index.ts`
5. Create `app/api/student/register/route.ts`
6. Create `app/student/page.tsx` — registration form
7. Create `app/pass/[passUuid]/page.tsx` — digital pass with QR
8. Create `components/QRScanner.tsx` — camera scanner component
9. Create `app/scan/page.tsx` — scanner page
10. Create `app/api/scan/[passUuid]/route.ts` — fetch student profile
11. Create `app/scan/[passUuid]/page.tsx` — student profile for rep
12. Create `app/api/scan/save/route.ts` — save scan record
13. Create `emails/StudentPassEmail.tsx` — QR pass email
14. Update `app/page.tsx` — add student pass CTA card
15. Update `app/admin/dashboard/page.tsx` — add Fair Day tab

---

## CRITICAL RULES FOR V4

- QR code encodes `/scan/[passUuid]` — NOT `/pass/[passUuid]`
- `/pass/[passUuid]` is what STUDENT bookmarks / shows on phone
- `/scan/[passUuid]` is what opens on REP's phone after scanning
- Email QR must be base64 inline PNG (use `qrcode` package, not `react-qr-code`)
- Browser QR display uses `react-qr-code` component
- `data_sharing_consent` must be TRUE before any student data is shown to rep
- Phone shown to rep ONLY if `whatsapp_consent = true`
- Email shown to rep ONLY if `email_consent = true`
- Duplicate scan by same university = update notes only, no duplicate row
- `/scan` page requires no login — university rep just opens URL on their phone
- Do NOT rebuild anything from v1, v2, or v3
