# IAES Fairs — Claude Code Prompt v16 Phase 2
# Multi-fair funnel routing — UNIVERSITY ONLY
# ─────────────────────────────────────────────
# Build ONLY after Phase 1 is live and all 8 checklist items are green.
# This phase wires the university registration funnel to accept an
# explicit fair id. Institution / campus-host / student funnels
# remain unchanged (Phase 3).
#
# The revenue path (premium slots, dedupe guard, v15 opt-in) is touched
# here. Verify every item in the Phase 2 checklist before shipping.

---

## WHAT THIS PHASE DOES

1. `/register/university` accepts `?fair=<fairId>` query param
2. Validates the requested fair is registration-open (server-side)
3. Falls back to "latest open fair" if ?fair is absent or invalid
   — existing registration links / QR codes / emails never break
4. `/fair/[fairId]` CTA buttons pass `?fair=<fairId>` to the form
5. All premium slot, add-on pool, dedupe, and v15 opt-in logic
   remains per-fair (already is — just verify after routing change)

INSTITUTION / CAMPUS-HOST / STUDENT: untouched. Phase 3.

---

## DECISION RECORD (locked)

- University-only multi-fair routing in Phase 2
- Backward-compatible: missing or invalid ?fair → latest open fair
- Server-side validation: fair must exist, is_active=true,
  status ∈ {PUBLISHED, ONGOING}, payment_gateway_active=true
- If validation fails → redirect to /register/university
  (latest open fair) with ?error=fair_unavailable
- Institution / campus-host / student → Phase 3

---

## 1. NO DATABASE CHANGES

All data is already per fair_id. No migration needed.

---

## 2. NEW HELPER: `lib/fair.ts` — `getRegistrationOpenFair()`

```typescript
// lib/fair.ts — ADD this function

export async function getRegistrationOpenFair(
  fairId?: string | null
): Promise<Fair | null> {
  // If fairId provided → validate + return that specific fair
  if (fairId) {
    const fair = await getFairById(fairId);

    // Validate: must exist, active, open for registration
    if (
      fair &&
      fair.is_active &&
      ['PUBLISHED', 'ONGOING'].includes(fair.status) &&
      fair.payment_gateway_active
    ) {
      return fair;
    }

    // Invalid fairId → fall through to latest open fair
    // (do not return null — don't break the funnel)
  }

  // Default: latest open fair (current behaviour, unchanged)
  const fairs = await getActiveFairs();
  return fairs.find(f =>
    f.payment_gateway_active &&
    ['PUBLISHED', 'ONGOING'].includes(f.status)
  ) ?? null;
}
```

---

## 3. UPDATE: `app/register/university/page.tsx`

Minimal change — read `?fair` from searchParams, pass to helper.
Everything else (form, steps, validation, submission) unchanged.

```typescript
// app/register/university/page.tsx

// BEFORE (existing):
// const fair = await getActiveFair();

// AFTER:
import { getRegistrationOpenFair } from '@/lib/fair';

interface Props {
  searchParams: { fair?: string; error?: string };
}

export default async function RegisterUniversityPage({
  searchParams,
}: Props) {
  const fair = await getRegistrationOpenFair(searchParams.fair ?? null);

  if (!fair) {
    // No registration-open fair at all → redirect home
    redirect('/');
  }

  // Rest of the page is unchanged — passes fair to the form
  // as before. All premium/pool/dedupe logic reads from fair.id.
  return (
    // ... existing JSX unchanged ...
  );
}
```

---

## 4. UPDATE: `app/fair/[fairId]/page.tsx`

Update the CTAs to pass `?fair=<fairId>` when linking to
the registration form. Everything else (Hero/Details/Itinerary)
is unchanged.

```typescript
// In FairCTASection.tsx — update university register link:

// BEFORE:
<Link href="/register/university">Register University →</Link>

// AFTER:
<Link href={`/register/university?fair=${fair.id}`}>
  Register University →
</Link>

// Institution CTA — NOT updated (Phase 3)
// Student CTA — NOT updated (Phase 3)
// Campus-host CTA — NOT updated (Phase 3)
```

---

## 5. UPDATE: `FairGrid` card CTA (in `components/FairGrid.tsx`)

Grid card already links to `/fair/[fairId]` for the detail page.
No change needed to the grid card itself — the detail page handles
passing ?fair to the form. The routing chain is:

```
Grid card → /fair/[fairId] → /register/university?fair=<fairId>
```

---

## 6. VERIFY: All Existing Revenue-Path Logic Is Per-Fair

After the routing change, manually verify these items:

### Premium slot check
```typescript
// In /api/register — premium validation:
const { data: slots } = await supabase
  .from('premium_slot_status')
  .select('slots_remaining')
  .eq('fair_id', body.fair_id)   // ← must be the requested fair
  .single();
```
Confirm `body.fair_id` is set from the fair the form loaded —
not hardcoded to "latest".

### Add-on table pool
```typescript
// In /api/register — pool check:
const { data: pool } = await supabase
  .from('addon_table_status')
  .select('tables_remaining')
  .eq('fair_id', body.fair_id)   // ← same fair
  .single();
```

### Dedupe guard (one registration per university per fair)
```typescript
// Existing dedupe check — confirm it filters by fair_id:
const { data: existing } = await supabase
  .from('registrations')
  .select('id')
  .eq('fair_id', body.fair_id)   // ← must scope to the fair
  .eq('contact_email', body.contact_email)
  .neq('status', 'cancelled')
  .maybeSingle();
```
If this query does NOT filter by fair_id, a university that
registered for August cannot register for December. Fix it.

### V15 opt-in (if built)
Confirm the opt-in record is scoped to fair_id, not global.

---

## 7. ERROR HANDLING

If someone arrives at `/register/university?fair=INVALID-UUID`:

```typescript
// getRegistrationOpenFair() returns the latest open fair as fallback
// The form loads with the latest fair — no error shown, no broken page
// This handles: expired links, old emails, bookmarked URLs

// If there is NO open fair at all:
// → redirect('/')  which shows BetweenFairsPage
```

If the fair exists but registration is closed:

```typescript
// getRegistrationOpenFair() does not return REGISTRATION_CLOSED fairs
// Falls back to latest open fair (or redirects to / if none)
```

---

## PHASE 2 VERIFICATION CHECKLIST

Verify ALL before shipping:

```
□ 1. /register/university?fair=<aug-fair-id>
     Loads correctly with August fair details
     Booth configurator shows August fair pricing
     Premium card shows August fair slot count
     Add-on table counter shows August fair pool

□ 2. /register/university?fair=<dec-fair-id>
     Loads correctly with December fair details
     Completely independent slot counts from August

□ 3. /register/university (no ?fair param)
     Loads with latest open fair — UNCHANGED BEHAVIOUR
     All existing QR codes / email links still work

□ 4. /register/university?fair=INVALID-UUID
     Falls back to latest open fair — no error page

□ 5. /fair/[aug-fair-id] → "Register University" button
     Links to /register/university?fair=<aug-fair-id> ✅

□ 6. Full registration flow — August fair:
     Fill form → submit → proforma generated with correct fair
     Fair name on proforma = August fair ✅
     Invoice fair_id = August fair id ✅

□ 7. Full registration flow — December fair:
     Same verification for December fair
     Premium slots count is INDEPENDENT of August

□ 8. Dedupe guard is per-fair:
     Register same email for August → success
     Register same email again for August → blocked (duplicate)
     Register same email for December → ALLOWED (different fair)

□ 9. Premium sold out on August fair:
     /register/university?fair=<aug-id> shows "Sold Out" on premium card
     /register/university?fair=<dec-id> shows available slots on premium

□ 10. Institution / campus-host / student funnels:
      All still pick "latest open fair" as before
      No ?fair param on their CTAs (Phase 3)
```

All 10 green → Phase 2 is complete.

---

## BUILD ORDER FOR V16 PHASE 2

1. Update `lib/fair.ts`:
   - Add `getRegistrationOpenFair(fairId?: string | null)`
2. Update `app/register/university/page.tsx`:
   - Read `?fair` from searchParams
   - Pass to `getRegistrationOpenFair()`
   - Everything else unchanged
3. Update `components/FairCTASection.tsx`:
   - University register Link adds `?fair=${fair.id}`
   - Institution / student / campus-host Links unchanged
4. Verify all 10 checklist items above
5. Deploy

STOP after step 4. Do not touch institution/student/campus-host.

---

## CRITICAL RULES FOR PHASE 2

- `getRegistrationOpenFair()` ALWAYS returns a fair if one is open.
  It never returns null when a valid open fair exists.
  Missing/invalid ?fair = graceful fallback, never a broken page.
- Do NOT scope dedupe check globally — it must be per fair_id.
  A university can register for multiple fairs.
- Premium slot view and add-on pool view are already per fair_id
  (created in v14). Confirm the queries pass the correct fair_id.
- FairCTASection: only the university CTA gets ?fair.
  Institution / student / campus-host CTAs are unchanged.
- Server validates fair is registration-open — client cannot
  bypass this by constructing a URL with a closed fair's id.
- Do NOT rebuild anything from v2–v15 or v16 Phase 1.
