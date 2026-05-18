# IAES Fairs — Claude Code Prompt v11 (ADDENDUM TO V2–V8)
# Add AFTER v8 is complete.
# Do NOT rebuild anything from v1–v8.
# This addendum adds: Fair Itinerary Builder (admin), Itinerary Display
# (landing page), Itinerary on Invoice/Proforma PDF, Itinerary in
# Briefing Email.

---

## CORE CONCEPT

The fair itinerary is the single source of truth for all tour stops.
Admin builds it → landing page renders it → invoice prints it →
briefing email sends it. Nothing is typed manually twice.

---

## 1. DATABASE

### New Table: `fair_itinerary`

```sql
CREATE TABLE fair_itinerary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) ON DELETE CASCADE NOT NULL,

  day_number INTEGER NOT NULL,         -- 1, 2, 3 (display order)
  event_date DATE NOT NULL,            -- 2026-08-06
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'CAMPUS_VISIT',   -- institutional visit at a college/university
      'OPEN_FAIR',      -- main public fair at hotel/venue
      'TRAVEL',         -- travel day, no event
      'FREE'            -- buffer/free day
    )),

  -- Venue details
  institution_name TEXT,               -- "IIT Gandhinagar" (null for OPEN_FAIR)
  venue_name TEXT,                     -- "Academic Block" / "Hotel Courtyard"
  city TEXT NOT NULL,                  -- "Gandhinagar" / "Ahmedabad"
  address TEXT,                        -- full address (optional)

  -- Timing
  start_time TIME,                     -- 10:00
  end_time TIME,                       -- 13:00

  -- Flags
  is_main_fair BOOLEAN DEFAULT false,  -- true = star badge on landing page
  is_confirmed BOOLEAN DEFAULT false,  -- false = [TBC] badge shown
  is_public BOOLEAN DEFAULT true,      -- false = admin-only, hidden from landing

  -- Notes (shown on landing page and invoice)
  notes TEXT,                          -- "Lunch provided by IAES"

  sort_order INTEGER DEFAULT 0,        -- drag-reorder support
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON fair_itinerary(fair_id);
CREATE INDEX ON fair_itinerary(fair_id, sort_order);
```

### Seed: August 2026 Fair Itinerary

```sql
-- Run after the fair record exists
DO $$
DECLARE v_fair_id UUID;
BEGIN
  SELECT id INTO v_fair_id FROM fairs
  WHERE name LIKE '%August 2026%' LIMIT 1;

  INSERT INTO fair_itinerary
    (fair_id, day_number, event_date, event_type,
     institution_name, venue_name, city,
     start_time, end_time,
     is_main_fair, is_confirmed, notes, sort_order)
  VALUES
  (v_fair_id, 1, '2026-08-06', 'CAMPUS_VISIT',
   'IIT Gandhinagar', 'Academic Block', 'Gandhinagar',
   '10:00', '13:00', false, true,
   'Lunch provided by IAES after the session.', 1),

  (v_fair_id, 2, '2026-08-07', 'CAMPUS_VISIT',
   'Nirma University', 'Conference Centre', 'Ahmedabad',
   '10:00', '13:00', false, false,
   NULL, 2),

  (v_fair_id, 3, '2026-08-08', 'OPEN_FAIR',
   NULL, 'Hotel Courtyard by Marriott', 'Ahmedabad',
   '18:00', '21:00', true, true,
   'Main open fair. Smart/formal dress recommended.', 3);
END $$;
```

---

## 2. TYPES — Add to `types/index.ts`

```typescript
export type ItineraryEventType =
  | 'CAMPUS_VISIT'
  | 'OPEN_FAIR'
  | 'TRAVEL'
  | 'FREE';

export interface FairItineraryStop {
  id: string;
  fair_id: string;
  day_number: number;
  event_date: string;           // ISO date string
  event_type: ItineraryEventType;
  institution_name: string | null;
  venue_name: string | null;
  city: string;
  address: string | null;
  start_time: string | null;    // "10:00"
  end_time: string | null;      // "13:00"
  is_main_fair: boolean;
  is_confirmed: boolean;
  is_public: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Update Fair interface:
export interface Fair {
  // ... existing fields ...
  itinerary?: FairItineraryStop[];   // populated when fetched with join
}
```

---

## 3. ADMIN PAGES

### 3A. Update `app/admin/fairs/[fairId]/edit/page.tsx`

Add an **Itinerary Builder** section below the existing fair details form.
This is the control panel that drives everything else.

```
FAIR ITINERARY
──────────────────────────────────────────────────────────

Drag stops to reorder. Changes save immediately.

[+ Add Campus Visit]  [+ Add Open Fair]  [+ Add Travel Day]

╔══════════════════════════════════════════════════════╗
║  ⠿  Day 1 — Wednesday, 6 August 2026                ║
║     Type: CAMPUS VISIT                               ║
║                                                      ║
║  Institution Name*  [IIT Gandhinagar            ]   ║
║  Venue / Hall       [Academic Block, Main Hall  ]   ║
║  City*              [Gandhinagar                ]   ║
║  Full Address       [IIT Campus, Palaj...       ]   ║
║                                                      ║
║  Start Time  [10:00 AM ▾]   End Time  [01:00 PM ▾] ║
║                                                      ║
║  Notes  [Lunch provided by IAES after session.  ]   ║
║                                                      ║
║  [✅ Venue Confirmed]   [⭐ Mark as Main Fair]        ║
║  [👁 Public]            [🗑 Delete Stop]              ║
╚══════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════╗
║  ⠿  Day 2 — Thursday, 7 August 2026                 ║
║     Type: CAMPUS VISIT                               ║
║                                                      ║
║  Institution Name*  [Nirma University           ]   ║
║  Venue / Hall       [Conference Centre          ]   ║
║  City*              [Ahmedabad                  ]   ║
║                                                      ║
║  Start Time  [10:00 AM ▾]   End Time  [01:00 PM ▾] ║
║                                                      ║
║  [⏳ Mark as Confirmed]   [⭐ Mark as Main Fair]      ║
║  [🗑 Delete Stop]                                    ║
╚══════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════╗
║  ⠿  Day 3 — Friday, 8 August 2026           ★ MAIN ║
║     Type: OPEN FAIR                                  ║
║                                                      ║
║  Venue / Hall*      [Hotel Courtyard Marriott   ]   ║
║  City*              [Ahmedabad                  ]   ║
║  Full Address       [Ramdev Nagar, S.G. Highway ]   ║
║                                                      ║
║  Start Time  [06:00 PM ▾]   End Time  [09:00 PM ▾] ║
║                                                      ║
║  Notes  [Smart/formal dress recommended.        ]   ║
║                                                      ║
║  [✅ Venue Confirmed]   [★ Main Fair ✓]              ║
║  [🗑 Delete Stop]                                    ║
╚══════════════════════════════════════════════════════╝
```

**UI Behaviour:**
- Each stop is an expandable/collapsible card
- `⠿` drag handle on left — reorder updates `sort_order`
- `is_confirmed` toggle: gray `[⏳ Mark Confirmed]` → green `[✅ Confirmed]`
- `is_main_fair` toggle: only ONE stop can be main fair at a time
- `is_public` toggle: hide a stop from landing page without deleting
- CAMPUS_VISIT shows `institution_name` field; OPEN_FAIR hides it
- All field changes auto-save on blur (no Save button needed per stop)
- Changes take effect on landing page immediately (revalidate: 60)

---

### 3B. API Routes for Itinerary CRUD

```typescript
// GET /api/admin/fairs/[fairId]/itinerary
// Returns all stops ordered by sort_order

// POST /api/admin/fairs/[fairId]/itinerary
// Body: { event_type, event_date, day_number, ...fields }
// Creates new stop, returns { stop }

// PATCH /api/admin/fairs/[fairId]/itinerary/[stopId]
// Body: any subset of stop fields
// Updates stop, returns { stop }
// Used for: field edits, toggle confirmed, toggle main fair

// DELETE /api/admin/fairs/[fairId]/itinerary/[stopId]
// Soft-guard: confirm dialog before delete
// Returns { success: true }

// PATCH /api/admin/fairs/[fairId]/itinerary/reorder
// Body: { orderedIds: string[] } — array of stop IDs in new order
// Updates sort_order for all stops in one transaction
// Returns { success: true }
```

**is_main_fair toggle logic (server-side):**
```typescript
// When setting a stop as main fair:
// 1. Set all other stops for this fair: is_main_fair = false
// 2. Set this stop: is_main_fair = true
// Atomic — both in one transaction
await supabase.rpc('set_main_fair_stop', {
  p_fair_id: fairId,
  p_stop_id: stopId
});

-- SQL function:
CREATE OR REPLACE FUNCTION set_main_fair_stop(
  p_fair_id UUID, p_stop_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE fair_itinerary SET is_main_fair = false
  WHERE fair_id = p_fair_id;
  UPDATE fair_itinerary SET is_main_fair = true
  WHERE id = p_stop_id AND fair_id = p_fair_id;
END;
$$ LANGUAGE plpgsql;
```

---

### 3C. Fair Control Panel — Itinerary Preview

In `app/admin/fairs/[fairId]/page.tsx`, add an itinerary summary
card in the STEP 1 (BUILD) section:

```
STEP 1: BUILD
✅ Fair details saved
✅ Pricing set
✅ T&C version 2026.1

ITINERARY                              [Edit Itinerary →]
─────────────────────────────────────────────────────
Day 1 · 6 Aug  IIT Gandhinagar         ✅ Confirmed
Day 2 · 7 Aug  Nirma University        ⏳ TBC
Day 3 · 8 Aug  Hotel Courtyard         ✅ Confirmed  ★
─────────────────────────────────────────────────────
⚠️  1 stop unconfirmed — update before announcing
```

Show warning if any public stop has `is_confirmed = false`.

---

## 4. LANDING PAGE

### Update `app/page.tsx`

Fetch itinerary alongside fair:

```typescript
async function getActiveFair(): Promise<Fair | null> {
  const supabase = createClient();
  const { data: fair } = await supabase
    .from('fairs')
    .select('*')
    .eq('is_active', true)
    .order('fair_date_start', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!fair) return null;

  // Fetch public itinerary stops
  const { data: itinerary } = await supabase
    .from('fair_itinerary')
    .select('*')
    .eq('fair_id', fair.id)
    .eq('is_public', true)
    .order('sort_order', { ascending: true });

  return { ...fair, itinerary: itinerary ?? [] };
}
```

---

### New Component: `FairItinerary.tsx`

```typescript
// components/FairItinerary.tsx

import type { FairItineraryStop } from '@/types';

const EVENT_LABELS = {
  CAMPUS_VISIT: 'Campus Fair',
  OPEN_FAIR:    'Open Fair',
  TRAVEL:       'Travel Day',
  FREE:         'Free Day',
};

const EVENT_COLORS = {
  CAMPUS_VISIT: 'bg-navy/5 border-navy/20',
  OPEN_FAIR:    'bg-gold/10 border-gold/40',
  TRAVEL:       'bg-gray-50 border-gray-200',
  FREE:         'bg-gray-50 border-gray-200',
};

function formatTime(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour > 12 ? hour - 12 : hour;
  return `${hour12}:${m} ${ampm}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function FairItinerary({
  stops,
  arriveBy,
  departAfter,
}: {
  stops: FairItineraryStop[];
  arriveBy?: string | null;
  departAfter?: string | null;
}) {
  if (!stops.length) return null;

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-500 mb-4">
        Tour Itinerary
      </h3>

      <div className="space-y-3">
        {stops.map((stop, index) => (
          <div
            key={stop.id}
            className={`
              relative rounded-xl border p-4
              ${EVENT_COLORS[stop.event_type]}
            `}
          >
            {/* Main Fair badge */}
            {stop.is_main_fair && (
              <span className="absolute -top-2.5 right-4
                inline-flex items-center gap-1 rounded-full
                bg-gold px-3 py-0.5 text-[10px] font-bold
                text-navy shadow-sm">
                ★ MAIN FAIR
              </span>
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {/* Day indicator */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full
                  bg-navy flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {index + 1}
                  </span>
                </div>

                <div>
                  {/* Date */}
                  <p className="text-xs font-semibold text-navy/50 uppercase
                    tracking-wide">
                    {formatDate(stop.event_date)}
                  </p>

                  {/* Institution or Venue */}
                  <p className="mt-0.5 font-serif text-base font-semibold
                    text-navy leading-tight">
                    {stop.institution_name ?? stop.venue_name}
                  </p>

                  {/* Sub-venue (when institution is shown) */}
                  {stop.institution_name && stop.venue_name && (
                    <p className="text-xs text-navy/60 mt-0.5">
                      {stop.venue_name}
                    </p>
                  )}

                  {/* City + type + time */}
                  <p className="mt-1 text-xs text-navy/50">
                    {EVENT_LABELS[stop.event_type]}
                    {stop.city ? ` · ${stop.city}` : ''}
                    {stop.start_time
                      ? ` · ${formatTime(stop.start_time)}`
                        + (stop.end_time
                          ? `–${formatTime(stop.end_time)}`
                          : '')
                      : ''}
                  </p>

                  {/* Notes */}
                  {stop.notes && (
                    <p className="mt-1.5 text-xs text-navy/60 italic">
                      {stop.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* TBC badge */}
              {!stop.is_confirmed && (
                <span className="flex-shrink-0 rounded-full bg-yellow-100
                  border border-yellow-300 px-2 py-0.5
                  text-[10px] font-semibold text-yellow-700">
                  TBC
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Arrive/depart note */}
      {(arriveBy || departAfter) && (
        <div className="mt-4 rounded-lg bg-navy/5 px-4 py-3
          flex flex-col sm:flex-row gap-2 sm:gap-6">
          {arriveBy && (
            <p className="text-xs text-navy/70">
              <span className="font-semibold">Arrive by:</span>{' '}
              {formatDate(arriveBy)} (EOD)
            </p>
          )}
          {departAfter && (
            <p className="text-xs text-navy/70">
              <span className="font-semibold">Depart after:</span>{' '}
              {formatDate(departAfter)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### Update `FairHero.tsx`

Add `FairItinerary` inside the hero, between the fair description
and the registration CTAs:

```typescript
// In FairHero.tsx — after fair description paragraph:

{fair.itinerary && fair.itinerary.length > 0 && (
  <FairItinerary
    stops={fair.itinerary}
    arriveBy={fair.arrive_by}
    departAfter={fair.depart_after}
  />
)}
```

---

## 5. INVOICE / PROFORMA PDF

In both `InvoiceINR.tsx` and `InvoiceUSD.tsx` (and `ProformaInvoicePDF.tsx`),
add an itinerary block below the fee table.

Fetch itinerary when generating the invoice:
```typescript
const { data: itinerary } = await supabase
  .from('fair_itinerary')
  .select('*')
  .eq('fair_id', registration.fair_id)
  .eq('is_public', true)
  .order('sort_order');
```

PDF block (using @react-pdf/renderer):

```tsx
{itinerary && itinerary.length > 0 && (
  <View style={styles.itinerarySection}>
    <Text style={styles.itineraryHeading}>TOUR ITINERARY</Text>
    <View style={styles.itineraryDivider} />

    {itinerary.map((stop) => (
      <View key={stop.id} style={styles.itineraryRow}>
        <Text style={styles.itineraryDay}>
          Day {stop.day_number} · {formatDateShort(stop.event_date)}
        </Text>
        <Text style={styles.itineraryVenue}>
          {stop.institution_name ?? stop.venue_name}
          {stop.institution_name && stop.venue_name
            ? `, ${stop.venue_name}` : ''}
          {' · '}{stop.city}
          {stop.start_time
            ? ' · ' + formatTime(stop.start_time) : ''}
          {stop.is_main_fair ? ' [MAIN FAIR]' : ''}
          {!stop.is_confirmed ? ' [TBC]' : ''}
        </Text>
        {stop.notes && (
          <Text style={styles.itineraryNote}>{stop.notes}</Text>
        )}
      </View>
    ))}

    <View style={styles.itineraryDivider} />

    {fair.arrive_by && (
      <Text style={styles.itineraryFooter}>
        Arrive by: {formatDateShort(fair.arrive_by)} (EOD) ·
        Depart after: {formatDateShort(fair.depart_after)}
      </Text>
    )}
    <Text style={styles.itineraryFooter}>
      Transportation and meals included for all tour days.
    </Text>
  </View>
)}
```

PDF styles:
```typescript
itinerarySection: { marginTop: 20, paddingTop: 14,
  borderTopWidth: 1, borderTopColor: '#E5E7EB' },
itineraryHeading: { fontSize: 8, fontWeight: 'bold',
  color: '#0B2B5C', textTransform: 'uppercase',
  letterSpacing: 0.8, marginBottom: 8 },
itineraryDivider: { height: 1, backgroundColor: '#E5E7EB',
  marginVertical: 6 },
itineraryRow: { marginBottom: 6 },
itineraryDay: { fontSize: 7, fontWeight: 'bold', color: '#0B2B5C' },
itineraryVenue: { fontSize: 7, color: '#374151', marginTop: 1 },
itineraryNote: { fontSize: 6.5, color: '#9CA3AF',
  fontStyle: 'italic', marginTop: 1 },
itineraryFooter: { fontSize: 6.5, color: '#6B7280', marginTop: 4 },
```

---

## 6. BRIEFING EMAIL (v6 Email 4 — Itinerary)

Update `emails/ItineraryEmail.tsx` to populate dynamically
from `fair_itinerary` table instead of hardcoded text:

```typescript
// In the email template:

{itinerary.map((stop) => (
  <Section key={stop.id}>
    <Row>
      <Column>
        <Text style={dayLabel}>
          Day {stop.day_number} · {formatDateLong(stop.event_date)}
        </Text>
        <Text style={venueText}>
          📍 {stop.institution_name ?? stop.venue_name}
          {stop.institution_name ? ` — ${stop.venue_name}` : ''}
        </Text>
        <Text style={timeText}>
          🕐 {formatTime(stop.start_time)}–{formatTime(stop.end_time)}
          · {stop.city}
          {stop.is_main_fair ? ' ★ MAIN FAIR' : ''}
        </Text>
        {stop.notes && (
          <Text style={noteText}>{stop.notes}</Text>
        )}
      </Column>
    </Row>
  </Section>
))}
```

---

## 7. FALLBACK ITINERARY (for `FALLBACK_FAIR` in page.tsx)

Update the FALLBACK_FAIR constant in `app/page.tsx`:

```typescript
const FALLBACK_FAIR: Fair = {
  // ... existing fields ...
  itinerary: [
    {
      id: 'preview-1',
      fair_id: 'preview',
      day_number: 1,
      event_date: '2026-08-06',
      event_type: 'CAMPUS_VISIT',
      institution_name: 'IIT Gandhinagar',
      venue_name: 'Academic Block',
      city: 'Gandhinagar',
      address: null,
      start_time: '10:00',
      end_time: '13:00',
      is_main_fair: false,
      is_confirmed: true,
      is_public: true,
      notes: 'Lunch provided by IAES.',
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'preview-2',
      fair_id: 'preview',
      day_number: 2,
      event_date: '2026-08-07',
      event_type: 'CAMPUS_VISIT',
      institution_name: 'Nirma University',
      venue_name: 'Conference Centre',
      city: 'Ahmedabad',
      address: null,
      start_time: '10:00',
      end_time: '13:00',
      is_main_fair: false,
      is_confirmed: false,
      is_public: true,
      notes: null,
      sort_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'preview-3',
      fair_id: 'preview',
      day_number: 3,
      event_date: '2026-08-08',
      event_type: 'OPEN_FAIR',
      institution_name: null,
      venue_name: 'Hotel Courtyard by Marriott',
      city: 'Ahmedabad',
      address: null,
      start_time: '18:00',
      end_time: '21:00',
      is_main_fair: true,
      is_confirmed: true,
      is_public: true,
      notes: 'Smart/formal dress recommended.',
      sort_order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
};
```

---

## BUILD ORDER FOR V11 (run after v8 is complete)

1.  SQL: Create `fair_itinerary` table
2.  SQL: Create `set_main_fair_stop()` function
3.  SQL: Seed August 2026 itinerary (3 stops)
4.  Update `types/index.ts` — FairItineraryStop, ItineraryEventType
5.  Create all itinerary API routes:
    - `GET  /api/admin/fairs/[fairId]/itinerary`
    - `POST /api/admin/fairs/[fairId]/itinerary`
    - `PATCH /api/admin/fairs/[fairId]/itinerary/[stopId]`
    - `DELETE /api/admin/fairs/[fairId]/itinerary/[stopId]`
    - `PATCH /api/admin/fairs/[fairId]/itinerary/reorder`
6.  Update `app/admin/fairs/[fairId]/edit/page.tsx` — itinerary builder UI
7.  Update `app/admin/fairs/[fairId]/page.tsx` — itinerary summary card
8.  Create `components/FairItinerary.tsx` — landing page component
9.  Update `components/FairHero.tsx` — embed FairItinerary
10. Update `app/page.tsx` — fetch itinerary, update FALLBACK_FAIR
11. Update `components/InvoiceView/InvoiceUSD.tsx` — itinerary PDF block
12. Update `components/InvoiceView/InvoiceINR.tsx` — itinerary PDF block
13. Update `components/InvoiceView/ProformaInvoicePDF.tsx` — itinerary PDF block
14. Update `emails/ItineraryEmail.tsx` (v6 Email 4) — dynamic from DB

---

## CRITICAL RULES FOR V11

- `is_main_fair` can only be true for ONE stop per fair — enforce via
  `set_main_fair_stop()` function, never raw UPDATE
- `is_public = false` hides a stop from landing page and invoice
  but keeps it in admin view (useful for internal logistics stops)
- TBC badge shows when `is_confirmed = false` AND `is_public = true`
- OPEN_FAIR type: `institution_name` field is hidden in admin UI
  (a hotel is not an institution)
- CAMPUS_VISIT type: both `institution_name` and `venue_name` shown
- Drag reorder calls `/itinerary/reorder` — updates all sort_order
  values in one atomic transaction
- Landing page uses `revalidate = 60` — changes appear within 1 minute
- Invoice itinerary fetched fresh at invoice generation time
- Briefing email itinerary fetched fresh at send time
- FALLBACK_FAIR itinerary is hardcoded — update it when real data changes
- Do NOT rebuild anything from v1–v8
