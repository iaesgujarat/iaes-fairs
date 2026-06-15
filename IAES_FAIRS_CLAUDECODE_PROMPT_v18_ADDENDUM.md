# IAES Fairs — Claude Code Prompt v18 (ADDENDUM TO V2–V17)
# Representative ID Card Generator
# ──────────────────────────────────
# Build AFTER v14 (premium booth) is complete.
# Independent of v16 and v17 — can be built any time after v14.
# Adds: ID card number on registrations, admin bulk/individual
# PDF download, A6 two-sided card using @react-pdf/renderer.

---

## WHAT THIS ADDS

1. `id_card_number` column on `registrations`
   Format: IAES-FAIR-2026-001 (sequential per fair, per year)
2. Admin dashboard: [Download ID Cards] button per confirmed registration
3. PDF generator: A6 two-sided ID card for each rep
   (2 cards for Standard, 4 cards for Premium — one per rep)
4. Admin bulk download: all confirmed registrations → ZIP of PDFs
5. Card is generated only for status = 'confirmed' registrations
   Proforma/pending registrations do not get ID cards

---

## DESIGN SPEC

```
Size:       A6 (105 × 148 mm) — fits standard ID holder / neck strap
Resolution: 150 dpi minimum for print (react-pdf handles this)
Stock:      200–300 gsm card stock recommended (noted in admin UI)
Finish:     Matte laminate recommended
Pages:      2 (page 1 = front, page 2 = back)
```

---

## 1. DATABASE

### 1A. Add `id_card_number` to `registrations`

```sql
ALTER TABLE registrations
  ADD COLUMN id_card_number TEXT UNIQUE;
  -- Generated when registration is confirmed (not at registration time)
  -- Format: IAES-FAIR-YYYY-NNN (sequential per fair)
  -- NULL until confirmed

CREATE SEQUENCE IF NOT EXISTS id_card_counter START 1;

CREATE OR REPLACE FUNCTION generate_id_card_number(p_fair_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_next INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_next := nextval('id_card_counter');
  RETURN 'IAES-FAIR-' || v_year || '-' || LPAD(v_next::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
```

### 1B. Auto-generate on confirmation

```sql
-- Trigger: when registration status changes to 'confirmed',
-- generate id_card_number if not already set

CREATE OR REPLACE FUNCTION assign_id_card_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed'
     AND OLD.status != 'confirmed'
     AND NEW.id_card_number IS NULL THEN
    NEW.id_card_number := generate_id_card_number(NEW.fair_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_id_card_number
  BEFORE UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION assign_id_card_number();
```

---

## 2. TYPES — Update `types/index.ts`

```typescript
// Update Registration interface:
export interface Registration {
  // ... existing fields ...
  id_card_number: string | null;
  // null = not yet confirmed
  // 'IAES-FAIR-2026-001' = confirmed, card can be generated
}
```

---

## 3. ID CARD PDF COMPONENT

```typescript
// components/IdCard/IdCardPDF.tsx
// Uses @react-pdf/renderer (already installed from v2)

import {
  Document, Page, View, Text, StyleSheet, Svg,
  Rect, Circle, G, Line,
} from '@react-pdf/renderer';
import type { Registration, Fair } from '@/types';

// A6 in points (1mm = 2.835pt)
// 105mm × 148mm = 297.6pt × 419.5pt
const A6_W = 297.6;
const A6_H = 419.5;

const NAVY  = '#0B2B5C';
const GOLD  = '#C9A227';
const WHITE = '#FFFFFF';
const LIGHT = '#E8EEF6';
const GRAY  = '#888888';
const MUTED = '#AAAAAA';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const s = StyleSheet.create({

  // ── PAGE ──────────────────────────────────────────────────
  page: {
    width:  A6_W,
    height: A6_H,
    backgroundColor: WHITE,
    fontFamily: 'Helvetica',
  },
  pageback: {
    width:  A6_W,
    height: A6_H,
    backgroundColor: NAVY,
    fontFamily: 'Helvetica',
  },

  // ── FRONT ─────────────────────────────────────────────────
  header: {
    backgroundColor: NAVY,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
  },
  goldStripe: {
    backgroundColor: GOLD,
    height: 5,
  },
  iaesText: {
    color: WHITE,
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 5,
    marginBottom: 4,
  },
  taglineText: {
    color: GOLD,
    fontSize: 7,
    letterSpacing: 2,
    marginBottom: 4,
  },
  eventText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 8,
    marginBottom: 2,
  },
  dateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 7,
  },
  body: {
    flex: 1,
    backgroundColor: WHITE,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  avatarCircle: {
    width:  72,
    height: 72,
    borderRadius: 36,
    backgroundColor: LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
  repName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    marginBottom: 3,
    textAlign: 'center',
  },
  repTitle: {
    fontSize: 8.5,
    color: GRAY,
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    width: '80%',
    height: 0.5,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
  },
  uniName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textAlign: 'center',
    marginBottom: 3,
  },
  uniCountry: {
    fontSize: 8.5,
    color: GRAY,
    textAlign: 'center',
    marginBottom: 14,
  },
  boothBadge: {
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  boothBadgeText: {
    color: GOLD,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  idNumber: {
    fontSize: 7.5,
    color: MUTED,
    letterSpacing: 1,
    marginTop: 4,
  },
  goldFooter: {
    backgroundColor: GOLD,
    height: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldFooterText: {
    color: NAVY,
    fontSize: 7,
    letterSpacing: 0.5,
  },

  // ── BACK ──────────────────────────────────────────────────
  backGoldStripeTop: {
    backgroundColor: GOLD,
    height: 5,
  },
  backContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 22,
  },
  qrBox: {
    width: 90,
    height: 90,
    backgroundColor: WHITE,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  qrPlaceholderText: {
    fontSize: 7,
    color: NAVY,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  qrSubText: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 12,
  },
  backDivider: {
    width: '80%',
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 10,
  },
  itineraryLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  itinRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 8,
  },
  itinDate: {
    fontSize: 8.5,
    color: 'rgba(255,255,255,0.55)',
    width: 68,
  },
  itinVenue: {
    fontSize: 8.5,
    color: WHITE,
    flex: 1,
  },
  itinVenueMain: {
    fontSize: 8.5,
    color: GOLD,
    fontFamily: 'Helvetica-Bold',
    flex: 1,
  },
  contactSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  contactHelper: {
    fontSize: 7.5,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 5,
  },
  contactEmail: {
    fontSize: 8.5,
    color: GOLD,
    textAlign: 'center',
    marginBottom: 3,
  },
  contactPhone: {
    fontSize: 8.5,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 12,
  },
  validBadge: {
    borderWidth: 0.5,
    borderColor: GOLD,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  validBadgeText: {
    fontSize: 7.5,
    color: GOLD,
    letterSpacing: 0.5,
  },
  backGoldStripeBottom: {
    backgroundColor: GOLD,
    height: 5,
  },
});

interface IdCardProps {
  registration: Registration;
  fair: Fair;
  repName: string;
  repNumber: number;   // 1, 2, 3, 4 — which rep this card is for
}

export function IdCardPDF({
  registration,
  fair,
  repName,
  repNumber,
}: IdCardProps) {

  const boothLabel = registration.pricing_tier === 'PREMIUM'
    ? 'PREMIUM BOOTH'
    : `BOOTH · ${registration.booth_type?.toUpperCase() ?? 'STANDARD'}`;

  const fairDateRange = fair.fair_date_start && fair.fair_date_end
    ? `${formatDate(fair.fair_date_start)} – ${formatDate(fair.fair_date_end)}`
    : formatDate(fair.fair_date_start ?? '');

  const validRange = `VALID: ${
    fair.arrive_by
      ? formatDate(fair.arrive_by).toUpperCase()
      : ''
  } – ${
    fair.depart_after
      ? formatDate(fair.depart_after).toUpperCase()
      : ''
  }`;

  return (
    <Document
      title={`IAES ID Card — ${repName} — ${registration.university_name}`}
      author="IAES Education Fairs"
      subject={`Fair Entry ID — ${fair.name}`}
    >

      {/* ── PAGE 1: FRONT ──────────────────────────────────── */}
      <Page size={[A6_W, A6_H]} style={s.page}>

        {/* Navy header */}
        <View style={s.header}>
          <Text style={s.iaesText}>IAES</Text>
          <Text style={s.taglineText}>INDO AMERICAN EDUCATION SOCIETY</Text>
          <Text style={s.eventText}>{fair.name}</Text>
          <Text style={s.dateText}>{fair.city}, Gujarat · {fairDateRange}</Text>
        </View>

        {/* Gold stripe */}
        <View style={s.goldStripe} />

        {/* White body */}
        <View style={s.body}>

          {/* Avatar */}
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{initials(repName)}</Text>
          </View>

          {/* Rep details */}
          <Text style={s.repName}>{repName}</Text>
          <Text style={s.repTitle}>
            {registration.contact_title ?? 'University Representative'}
          </Text>

          <View style={s.divider} />

          {/* University */}
          <Text style={s.uniName}>{registration.university_name}</Text>
          <Text style={s.uniCountry}>{registration.university_country ?? 'USA'}</Text>

          {/* Booth badge */}
          <View style={s.boothBadge}>
            <Text style={s.boothBadgeText}>{boothLabel}</Text>
          </View>

          {/* Rep number if multiple */}
          {registration.total_reps > 1 && (
            <Text style={{ fontSize: 8, color: GRAY, marginBottom: 4 }}>
              Representative {repNumber} of {registration.total_reps}
            </Text>
          )}

          {/* ID number */}
          <Text style={s.idNumber}>{registration.id_card_number}</Text>

        </View>

        {/* Gold footer */}
        <View style={s.goldFooter}>
          <Text style={s.goldFooterText}>fairs.iaesgujarat.org</Text>
        </View>

      </Page>

      {/* ── PAGE 2: BACK ───────────────────────────────────── */}
      <Page size={[A6_W, A6_H]} style={s.pageback}>

        <View style={s.backGoldStripeTop} />

        <View style={s.backContent}>

          {/* QR placeholder */}
          <View style={s.qrBox}>
            <Text style={s.qrPlaceholderText}>QR</Text>
            <Text style={{ fontSize: 6, color: GRAY, textAlign: 'center' }}>
              {registration.id_card_number}
            </Text>
          </View>
          <Text style={s.qrSubText}>Scan to verify registration</Text>

          <View style={s.backDivider} />

          {/* Itinerary */}
          <Text style={s.itineraryLabel}>TOUR ITINERARY</Text>

          {fair.itinerary?.filter(s => s.is_public).map((stop) => (
            <View key={stop.id} style={s.itinRow}>
              <Text style={s.itinDate}>
                {new Date(stop.event_date).toLocaleDateString('en-IN',
                  { day: 'numeric', month: 'short', weekday: 'short' })}
              </Text>
              <Text style={stop.is_main_fair ? s.itinVenueMain : s.itinVenue}>
                {stop.institution_name ?? stop.venue_name}
                {stop.is_main_fair ? ' ★' : ''}
              </Text>
            </View>
          ))}

          <View style={s.backDivider} />

          {/* Contact */}
          <View style={s.contactSection}>
            <Text style={s.contactHelper}>For assistance contact IAES team</Text>
            <Text style={s.contactEmail}>educationfair@iaesgujarat.org</Text>
            <Text style={s.contactPhone}>+91 9825593262</Text>
          </View>

          {/* Valid dates badge */}
          <View style={s.validBadge}>
            <Text style={s.validBadgeText}>{validRange}</Text>
          </View>

        </View>

        <View style={s.backGoldStripeBottom} />

      </Page>

    </Document>
  );
}
```

---

## 4. NEW API: `/api/admin/registrations/[registrationId]/id-cards`

```typescript
// app/api/admin/registrations/[registrationId]/id-cards/route.ts
// GET: generates and returns ID card PDF(s) for all reps

import { NextResponse }    from 'next/server';
import { renderToBuffer }  from '@react-pdf/renderer';
import { createAdminClient } from '@/lib/supabase/server';
import { IdCardPDF }       from '@/components/IdCard/IdCardPDF';

export async function GET(
  _req: Request,
  { params }: { params: { registrationId: string } }
) {
  const supabase = createAdminClient();

  // Auth: verify admin session
  // ... existing admin auth pattern ...

  // Fetch registration + fair + itinerary
  const { data: reg } = await supabase
    .from('registrations')
    .select('*, fairs(*, fair_itinerary(*))')
    .eq('id', params.registrationId)
    .single();

  if (!reg) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Only confirmed registrations get ID cards
  if (reg.status !== 'confirmed') {
    return NextResponse.json(
      { error: 'ID cards only available for confirmed registrations.' },
      { status: 400 }
    );
  }

  const fair = {
    ...reg.fairs,
    itinerary: reg.fairs.fair_itinerary ?? [],
  };

  // Determine rep names
  // Primary rep is always contact_name
  // Additional reps use placeholder names — admin fills in on the card cover
  // (We don't collect individual rep names beyond the primary contact)
  const repNames: string[] = [reg.contact_name];
  for (let i = 2; i <= reg.total_reps; i++) {
    repNames.push(`Representative ${i}`);
    // Admin can re-print after editing rep names in a future enhancement
  }

  // Generate one PDF per rep, return as separate files
  // For multiple reps: return a multi-file response or ZIP
  if (reg.total_reps === 1) {
    // Single PDF — return directly
    const pdfBuffer = await renderToBuffer(
      <IdCardPDF
        registration={reg}
        fair={fair}
        repName={repNames[0]}
        repNumber={1}
      />
    );

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="IAES-ID-${reg.id_card_number}-REP1.pdf"`,
      },
    });
  }

  // Multiple reps — ZIP using JSZip (install: npm install jszip)
  const JSZip = (await import('jszip')).default;
  const zip   = new JSZip();

  for (let i = 0; i < repNames.length; i++) {
    const pdfBuffer = await renderToBuffer(
      <IdCardPDF
        registration={reg}
        fair={fair}
        repName={repNames[i]}
        repNumber={i + 1}
      />
    );
    zip.file(
      `IAES-ID-${reg.id_card_number}-REP${i + 1}.pdf`,
      pdfBuffer
    );
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  return new Response(zipBuffer, {
    headers: {
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="IAES-ID-${reg.id_card_number}-ALL-REPS.zip"`,
    },
  });
}
```

---

## 5. NEW API: `/api/admin/fairs/[fairId]/id-cards-bulk`

```typescript
// app/api/admin/fairs/[fairId]/id-cards-bulk/route.ts
// GET: ZIP of all ID cards for ALL confirmed registrations in a fair

import JSZip from 'jszip';
import { renderToBuffer } from '@react-pdf/renderer';

export async function GET(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  const supabase = createAdminClient();
  // ... auth check ...

  const { data: registrations } = await supabase
    .from('registrations')
    .select('*, fairs(*, fair_itinerary(*))')
    .eq('fair_id', params.fairId)
    .eq('status', 'confirmed')
    .order('id_card_number', { ascending: true });

  if (!registrations?.length) {
    return NextResponse.json(
      { error: 'No confirmed registrations found.' },
      { status: 404 }
    );
  }

  const zip = new JSZip();

  for (const reg of registrations) {
    const fair = {
      ...reg.fairs,
      itinerary: reg.fairs.fair_itinerary ?? [],
    };
    const repNames = [reg.contact_name];
    for (let i = 2; i <= reg.total_reps; i++) {
      repNames.push(`Representative ${i}`);
    }

    for (let i = 0; i < repNames.length; i++) {
      const pdfBuffer = await renderToBuffer(
        <IdCardPDF
          registration={reg}
          fair={fair}
          repName={repNames[i]}
          repNumber={i + 1}
        />
      );
      // Folder per university
      const folder = zip.folder(
        `${reg.id_card_number} - ${reg.university_name}`
      );
      folder?.file(
        `REP-${i + 1}-${repNames[i].replace(/\s+/g, '-')}.pdf`,
        pdfBuffer
      );
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  const filename  = `IAES-ID-Cards-Fair-${new Date().toISOString().split('T')[0]}.zip`;

  return new Response(zipBuffer, {
    headers: {
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

---

## 6. UPDATE: Admin Dashboard

### Per-registration row action

In `app/admin/dashboard/page.tsx` — add to each confirmed
registration row in the University Registrations table:

```typescript
// In the Actions column — add alongside existing Invoice/Confirm buttons:

{reg.status === 'confirmed' && reg.id_card_number && (
  <a
    href={`/api/admin/registrations/${reg.id}/id-cards`}
    download
    className="text-xs font-medium text-navy underline underline-offset-2"
  >
    ID Card{reg.total_reps > 1 ? 's' : ''}
    {reg.total_reps > 1 ? ` (${reg.total_reps})` : ''}
  </a>
)}
```

### Bulk download button

In the University Registrations tab header — add alongside
existing "Download CSV" button:

```typescript
<a
  href={`/api/admin/fairs/${activeFairId}/id-cards-bulk`}
  download
  className="..."
>
  Download All ID Cards (ZIP)
</a>
```

### Print instruction note

Below the bulk download button:

```typescript
<p className="text-xs text-gray-400 mt-2">
  Print on A6 card stock (105 × 148 mm) · 200–300 gsm recommended.
  Insert in standard ID holder with neck strap.
  Generate ID cards only for confirmed (paid) registrations.
</p>
```

### ID card number column

Add `ID Card` column to the registrations table:

| University | Contact | Booth | ID Card | Status | Actions |
|---|---|---|---|---|---|
| ASU | Janet | Standard | IAES-FAIR-2026-001 | ✅ Confirmed | Invoice · ID Card |
| NYU | John | Premium | IAES-FAIR-2026-002 | ✅ Confirmed | Invoice · ID Cards (4) |
| BU | Sarah | Standard | — | ⏳ Pending | Invoice |

---

## 7. DEPENDENCY

```bash
npm install jszip
npm install @types/jszip
```

`@react-pdf/renderer` is already installed from v2. No other deps needed.

---

## 8. ADDITIONAL PRINT GUIDANCE (shown in admin UI)

```
PRINTING GUIDE — IAES REP ID CARDS
────────────────────────────────────────────────────────
Paper:     A6 (105 × 148 mm) card stock, 200–300 gsm
           Available at any print shop or stationery store

Print:     Colour, both sides (duplex)
           Front = rep photo/details · Back = itinerary/QR

Finish:    Optional: matte laminate or soft-touch coating
           This protects the card from fair-day wear

Holder:    Standard credit-card ID holder with lanyard/neck strap
           Available online (Amazon/Flipkart)
           Order: 1 holder per rep
           Standard: 2 holders per registration
           Premium:  4 holders per registration

Timeline:  Print at least 3 days before the fair
           Hand out at the IAES registration desk on arrival day
```

---

## BUILD ORDER FOR V18

1.  SQL: Add `id_card_number` to `registrations`
2.  SQL: Create `id_card_counter` sequence
3.  SQL: Create `generate_id_card_number()` function
4.  SQL: Create `assign_id_card_number()` trigger function
5.  SQL: Create `set_id_card_number` trigger on `registrations`
6.  Run: `npm install jszip @types/jszip`
7.  Update `types/index.ts` — add `id_card_number` to Registration
8.  Create `components/IdCard/IdCardPDF.tsx`
9.  Create `app/api/admin/registrations/[registrationId]/id-cards/route.ts`
10. Create `app/api/admin/fairs/[fairId]/id-cards-bulk/route.ts`
11. Update `app/admin/dashboard/page.tsx`:
    - Add `ID Card` column to registrations table
    - Add per-row `ID Card` download link (confirmed only)
    - Add bulk `Download All ID Cards (ZIP)` button
    - Add print instructions note

---

## CRITICAL RULES FOR V18

- ID card PDF is generated ONLY when status = 'confirmed'
  Proforma/registered/payment_open = no card
- `id_card_number` is assigned by DB trigger on confirmation
  Never assign it manually or in application code
- The trigger is idempotent: only assigns if id_card_number IS NULL
  Re-confirming a registration does not overwrite the number
- Primary rep name = `registration.contact_name`
  Additional reps use placeholder "Representative N"
  Admin prints and writes additional rep names manually on the card
  OR a future enhancement collects individual rep names
- For Premium (4 reps): bulk download returns ZIP with 4 PDFs
  For Standard (2 reps): ZIP with 2 PDFs
  For Standard with 1 rep: single PDF (no ZIP)
- The QR code on the back uses the id_card_number as text
  (react-pdf does not natively render QR codes — use a QR
  generation library like `qrcode` to generate a base64 PNG
  and embed as <Image> in the PDF back page)
- Print spec: A6 (105 × 148 mm), 150+ dpi, duplex
- Do NOT rebuild anything from v2–v17
