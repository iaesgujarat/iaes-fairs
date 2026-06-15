# IAES Fairs — Claude Code Prompt v16 Phase 1
# Multi-fair landing page — READ SIDE ONLY
# ─────────────────────────────────────────
# Build AFTER: Supabase Custom SMTP, V14 self-test, fair-assets check
# Do NOT build Phase 2 until Phase 1 is live and eyeballed.
# Do NOT touch any registration funnel (register/university,
# register/institution, student, campus-host) in this phase.
# Single-fair behavior must remain 100% unchanged.

---

## WHAT THIS PHASE DOES

1. `lib/fair.ts` — adds `getActiveFairs()` plural alongside
   existing `getActiveFair()` (which is kept unchanged as a wrapper)
2. `app/page.tsx` — 0 / 1 / ≥2 branching:
   - 0 fairs → BetweenFairsPage (v12, unchanged)
   - 1 fair  → TODAY'S rich single-fair landing (unchanged, zero regression)
   - ≥2 fairs → new FairGrid component
3. New `components/FairGrid.tsx` — equal-width column cards
4. New `app/fair/[fairId]/page.tsx` — per-fair detail page
   (reuses existing FairHero / FairDetails / FairItinerary / FairCTASection)
5. New `app/api/fairs/[fairId]/slot-status/route.ts` — live slot bar

NO migration. NO schema change. NO funnel changes.

---

## DECISION RECORD (locked — do not revisit)

A. Selection:  status ∈ {PUBLISHED, REGISTRATION_CLOSED, ONGOING}
               is_active = true (existing filter, covers all three)
B. Layout:     1 fair = today's rich landing (untouched)
               ≥2 fairs = FairGrid card columns
               0 fairs = BetweenFairsPage (unchanged)
C. Entry:      Grid card → /fair/[fairId] → register (not direct to form)
D. Funnel:     Phase 2 only — NOT in this phase
E. Order:      fair_date_start ASC (soonest left / top)
F. Everything else (premium/pool/itinerary/waitlist): unchanged, per-fair

---

## 1. NO DATABASE CHANGES

Add one index only (performance, not correctness):

```sql
CREATE INDEX IF NOT EXISTS fairs_active_date_idx
  ON fairs (fair_date_start ASC)
  WHERE is_active = true;
```

---

## 2. UPDATE: `lib/fair.ts`

Add `getActiveFairs()`. Keep `getActiveFair()` as an identical
wrapper — every existing caller continues to work.

```typescript
// lib/fair.ts  — ADD these two functions

// NEW — plural fetch for multi-fair grid
export async function getActiveFairs(): Promise<Fair[]> {
  const supabase = createClient();

  const { data: fairs } = await supabase
    .from('fairs')
    .select('*')
    .eq('is_active', true)
    .in('status', ['PUBLISHED', 'REGISTRATION_CLOSED', 'ONGOING'])
    .order('fair_date_start', { ascending: true })
    .limit(3);                    // admin responsibility: max 3 concurrent

  if (!fairs?.length) return [];

  // Fetch public itinerary for each fair in parallel
  const withItinerary = await Promise.all(
    fairs.map(async (fair) => {
      const { data: itinerary } = await supabase
        .from('fair_itinerary')
        .select('*')
        .eq('fair_id', fair.id)
        .eq('is_public', true)
        .order('sort_order', { ascending: true });
      return { ...fair, itinerary: itinerary ?? [] };
    })
  );

  return withItinerary as Fair[];
}

// KEPT — backward-compatible wrapper, all existing callers unchanged
export async function getActiveFair(): Promise<Fair | null> {
  const fairs = await getActiveFairs();
  return fairs[0] ?? null;
}

// NEW — fetch one fair by id (used by /fair/[fairId] detail page)
export async function getFairById(id: string): Promise<Fair | null> {
  const supabase = createClient();

  const { data: fair } = await supabase
    .from('fairs')
    .select('*')
    .eq('id', id)
    .single();

  if (!fair) return null;

  const { data: itinerary } = await supabase
    .from('fair_itinerary')
    .select('*')
    .eq('fair_id', id)
    .eq('is_public', true)
    .order('sort_order', { ascending: true });

  return { ...fair, itinerary: itinerary ?? [] } as Fair;
}
```

---

## 3. UPDATE: `app/page.tsx`

Minimal change. Only the 0-fair and ≥2-fair branches are new.
The 1-fair branch is untouched — same components, same props.

```typescript
// app/page.tsx  — full replacement

import { SiteHeader }       from '@/components/SiteHeader';
import { SiteFooter }       from '@/components/SiteFooter';
import { FairHero }         from '@/components/FairHero';
import { FairDetails }      from '@/components/FairDetails';
import { FairCTASection }   from '@/components/FairCTASection';
import { FairGrid }         from '@/components/FairGrid';
import { BetweenFairsPage } from '@/components/BetweenFairsPage';
import {
  getActiveFairs,
  getLastConcludedFair,
  getPastFairs,
} from '@/lib/fair';
import { FALLBACK_FAIR } from '@/lib/fallback';

export const revalidate = 60;

export default async function Home() {
  const fairs = await getActiveFairs();

  // ── 0 fairs: between-fairs waitlist page (v12, unchanged) ──
  if (fairs.length === 0) {
    const [lastFair, pastFairs] = await Promise.all([
      getLastConcludedFair(),
      getPastFairs(),
    ]);
    return (
      <>
        <SiteHeader />
        <BetweenFairsPage lastFair={lastFair} pastFairs={pastFairs} />
        <SiteFooter />
      </>
    );
  }

  // ── 1 fair: today's rich single-fair landing — UNTOUCHED ───
  if (fairs.length === 1) {
    const fair = fairs[0] ?? FALLBACK_FAIR;
    return (
      <>
        <SiteHeader />
        <main>
          <FairHero fair={fair} />
          <FairDetails fair={fair} />
          <FairCTASection fair={fair} />
        </main>
        <SiteFooter />
      </>
    );
  }

  // ── ≥2 fairs: equal-width column grid ──────────────────────
  return (
    <>
      <SiteHeader />
      <main>
        <FairGrid fairs={fairs} />
      </main>
      <SiteFooter />
    </>
  );
}
```

---

## 4. NEW COMPONENT: `components/FairGrid.tsx`

Server component. Renders N equal-width columns.
Each column is a card linking to /fair/[fairId].

```typescript
// components/FairGrid.tsx

import Link from 'next/link';
import type { Fair } from '@/types';

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions =
    { day: 'numeric', month: 'long', year: 'numeric' };
  if (!end) return s.toLocaleDateString('en-IN', opts);
  const e = new Date(end);
  // Same month: "6–8 August 2026"
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString('en-IN',
      { month: 'long', year: 'numeric' })}`;
  }
  return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString('en-IN', opts)}`;
}

function formatDeadline(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN',
    { day: 'numeric', month: 'short', year: 'numeric' });
}

function isEarlyBirdActive(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today <= new Date(deadline);
}

function fairBadge(fair: Fair): { label: string; bg: string; color: string } {
  if (fair.status === 'ONGOING')
    return { label: '● Live now', bg: '#16a34a', color: '#fff' };
  if (fair.status === 'REGISTRATION_CLOSED')
    return { label: 'Registration closed', bg: '#F1EFE8', color: '#5F5E5A' };
  // PUBLISHED
  if (fair.payment_gateway_active)
    return { label: 'Registration open', bg: '#C9A227', color: '#0B2B5C' };
  return { label: 'Coming soon', bg: '#F1EFE8', color: '#5F5E5A' };
}

export function FairGrid({ fairs }: { fairs: Fair[] }) {
  const count = fairs.length;

  return (
    <div style={{
      // Equal columns separated by a 1px divider line
      display: 'grid',
      gridTemplateColumns: `repeat(${count}, 1fr)`,
      gap: '1px',
      background: '#E5E7EB',        // gap color = divider
      minHeight: '100vh',
    }}
    // Mobile: stack vertically
    className="fair-grid-responsive"
    >
      {fairs.map((fair, index) => (
        <FairCard key={fair.id} fair={fair} isPrimary={index === 0} />
      ))}

      <style>{`
        @media (max-width: 640px) {
          .fair-grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function FairCard({
  fair,
  isPrimary,
}: {
  fair: Fair;
  isPrimary: boolean;
}) {
  const badge     = fairBadge(fair);
  const earlyBird = isEarlyBirdActive(fair.earlybird_deadline);
  const price     = earlyBird && fair.price_earlybird_usd
    ? fair.price_earlybird_usd
    : fair.price_standard_usd;

  const bg      = isPrimary ? '#0B2B5C' : 'var(--color-background-primary)';
  const text    = isPrimary ? '#fff'    : 'var(--color-text-primary)';
  const muted   = isPrimary
    ? 'rgba(255,255,255,0.6)'
    : 'var(--color-text-secondary)';
  const divider = isPrimary
    ? 'rgba(255,255,255,0.1)'
    : 'var(--color-border-tertiary)';

  return (
    <div style={{
      background: bg,
      color: text,
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1.5rem 1.5rem',
    }}>

      {/* Status badge */}
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        padding: '3px 10px',
        borderRadius: 99,
        background: badge.bg,
        color: badge.color,
        width: 'fit-content',
        marginBottom: '1rem',
      }}>
        {badge.label}
      </span>

      {/* Fair name */}
      <h2 style={{
        fontSize: 17,
        fontWeight: 500,
        lineHeight: 1.35,
        marginBottom: '.4rem',
        color: text,
      }}>
        {fair.name}
      </h2>

      {/* Date range */}
      <p style={{ fontSize: 13, color: muted, marginBottom: 2 }}>
        {formatDateRange(
          fair.fair_date_start ?? fair.fair_date,
          fair.fair_date_end ?? null
        )}
      </p>

      {/* City */}
      <p style={{ fontSize: 12, color: muted, marginBottom: '1.25rem' }}>
        {fair.city}, Gujarat
      </p>

      {/* Itinerary preview — max 3 stops */}
      {fair.itinerary && fair.itinerary.length > 0 && (
        <div style={{ flex: 1, marginBottom: '1.25rem' }}>
          {fair.itinerary.slice(0, 3).map((stop) => (
            <div key={stop.id} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              fontSize: 12,
              padding: '5px 0',
              borderBottom: `0.5px solid ${divider}`,
            }}>
              <span style={{
                width: 6, height: 6,
                borderRadius: '50%',
                background: stop.is_main_fair ? '#C9A227' : '#378ADD',
                flexShrink: 0,
                marginTop: 5,
              }} />
              <span style={{ minWidth: 44, fontSize: 11, color: muted }}>
                {new Date(stop.event_date).toLocaleDateString('en-IN',
                  { day: 'numeric', month: 'short' })}
              </span>
              <span style={{ color: isPrimary
                ? 'rgba(255,255,255,0.85)'
                : 'var(--color-text-primary)' }}>
                {stop.institution_name ?? stop.venue_name}
                {stop.is_main_fair &&
                  <span style={{ color: '#C9A227', marginLeft: 4, fontSize: 10 }}>★</span>}
                {!stop.is_confirmed &&
                  <span style={{ color: muted, marginLeft: 4, fontSize: 10 }}>[TBC]</span>}
              </span>
            </div>
          ))}
          {fair.itinerary.length > 3 && (
            <p style={{ fontSize: 11, color: muted, marginTop: 6 }}>
              +{fair.itinerary.length - 3} more stop{fair.itinerary.length - 3 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Price + CTA */}
      <div style={{ marginTop: 'auto' }}>

        {earlyBird && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 10,
            fontWeight: 500,
            background: '#C9A227',
            color: '#0B2B5C',
            padding: '2px 8px',
            borderRadius: 99,
            marginBottom: 6,
          }}>
            ⭐ Early bird · ends {formatDeadline(fair.earlybird_deadline)}
          </div>
        )}

        <p style={{
          fontSize: 24,
          fontWeight: 500,
          color: isPrimary ? '#fff' : '#0B2B5C',
          marginBottom: 2,
        }}>
          {price ? `USD ${price.toLocaleString()}` : 'TBC'}
        </p>

        {earlyBird && fair.price_standard_usd && (
          <p style={{ fontSize: 11, color: muted, marginBottom: 10 }}>
            USD {fair.price_standard_usd.toLocaleString()} after{' '}
            {formatDeadline(fair.earlybird_deadline)}
          </p>
        )}

        {/* Primary CTA → per-fair detail page */}
        <Link
          href={`/fair/${fair.id}`}
          style={{
            display: 'block',
            width: '100%',
            padding: '10px 0',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            textAlign: 'center',
            background: isPrimary ? '#C9A227' : '#0B2B5C',
            color: isPrimary ? '#0B2B5C' : '#fff',
            textDecoration: 'none',
            marginBottom: 8,
          }}
        >
          View Fair Details →
        </Link>

        {/* Institution CTA */}
        <Link
          href={`/fair/${fair.id}#institution`}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 0',
            borderRadius: 8,
            fontSize: 12,
            textAlign: 'center',
            background: 'transparent',
            border: `0.5px solid ${isPrimary
              ? 'rgba(255,255,255,0.2)'
              : 'var(--color-border-tertiary)'}`,
            color: muted,
            textDecoration: 'none',
          }}
        >
          Register institution (free) →
        </Link>
      </div>
    </div>
  );
}
```

---

## 5. NEW PAGE: `app/fair/[fairId]/page.tsx`

Per-fair detail page. Reuses ALL existing components.
Identical to today's single-fair landing — just parameterised by id.

```typescript
// app/fair/[fairId]/page.tsx

import { notFound }       from 'next/navigation';
import { SiteHeader }     from '@/components/SiteHeader';
import { SiteFooter }     from '@/components/SiteFooter';
import { FairHero }       from '@/components/FairHero';
import { FairDetails }    from '@/components/FairDetails';
import { FairCTASection } from '@/components/FairCTASection';
import { getFairById }    from '@/lib/fair';

export const revalidate = 60;

interface Props {
  params: { fairId: string };
}

export default async function FairDetailPage({ params }: Props) {
  const fair = await getFairById(params.fairId);

  if (!fair) notFound();

  // Must be publicly visible (not DRAFT)
  if (fair.status === 'DRAFT') notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <FairHero    fair={fair} />
        <FairDetails fair={fair} />
        <FairCTASection fair={fair} />
      </main>
      <SiteFooter />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const fair = await getFairById(params.fairId);
  return {
    title: fair
      ? `${fair.name} — IAES Education Fairs`
      : 'Fair Not Found',
  };
}
```

---

## 6. NEW API: `/api/fairs/[fairId]/slot-status`

Used by FairCard (client-side) for the live slot bar.
Phase 1 does NOT show slot bar in grid cards — this API is
prepared now so Phase 2 can use it without a new route.

```typescript
// app/api/fairs/[fairId]/slot-status/route.ts

import { createClient }  from '@/lib/supabase/server';
import { NextResponse }  from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  const supabase = createClient();

  const [fairRes, countRes] = await Promise.all([
    supabase.from('fairs')
      .select('max_universities')
      .eq('id', params.fairId)
      .single(),

    supabase.from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('fair_id', params.fairId)
      .not('status', 'eq', 'cancelled'),
  ]);

  const total     = fairRes.data?.max_universities ?? 30;
  const taken     = countRes.count ?? 0;
  const remaining = Math.max(0, total - taken);

  return NextResponse.json({ total, taken, remaining });
}
```

---

## PHASE 1 VERIFICATION CHECKLIST

After deploying Phase 1, verify ALL of the following before
giving approval to build Phase 2:

```
□ 1. With 1 active fair:
     / loads today's rich single-fair landing unchanged
     FairHero, FairDetails, FairCTASection all render correctly
     No visual regression

□ 2. With 2 active fairs (test by temporarily publishing a second):
     / loads FairGrid with 2 equal columns
     Column 1 (soonest) = navy treatment
     Column 2 = light treatment
     Both link to /fair/[fairId]

□ 3. /fair/[fairId] loads the detail page for each fair
     All existing components render correctly (Hero/Details/Itinerary/CTA)
     DRAFT fair returns 404

□ 4. All registration funnels (register/university, register/institution,
     student, campus-host) still work exactly as before
     NO ?fair= param yet — they pick "latest open fair" as always

□ 5. Concluding one fair (set is_active=false on second test fair)
     returns the landing page to single-fair rich layout
     within 60 seconds (revalidate: 60)

□ 6. 0 active fairs → BetweenFairsPage renders (v12)

□ 7. Mobile: at ≤640px, grid columns stack vertically

□ 8. /api/fairs/[fairId]/slot-status returns correct JSON
```

Only after all 8 are green: approve Phase 2.

---

## BUILD ORDER FOR V16 PHASE 1

1. SQL: `CREATE INDEX IF NOT EXISTS fairs_active_date_idx`
2. Update `lib/fair.ts`:
   - Add `getActiveFairs()`
   - Add `getFairById()`
   - Keep `getActiveFair()` as wrapper (do not modify)
3. Create `app/api/fairs/[fairId]/slot-status/route.ts`
4. Create `components/FairGrid.tsx` (includes `FairCard`)
5. Create `app/fair/[fairId]/page.tsx`
6. Update `app/page.tsx` — 0/1/≥2 branching

STOP. Do not touch any registration funnel.
Do not build Phase 2 until checklist above is all green.

---

## CRITICAL RULES FOR PHASE 1

- `getActiveFair()` must remain identical — it is now a wrapper
  around `getActiveFairs()[0]`. Do not change its signature or
  return type. Every existing caller (registration forms, admin
  pages, invoice generation, proforma) must continue to work.
- The 1-fair branch in page.tsx must use THE EXACT SAME components
  as today. No refactoring, no prop changes, no new wrappers.
- FairGrid card CTA links to `/fair/[fairId]` — NOT to
  `/register/university`. Phase 2 will handle the funnel routing.
- `/fair/[fairId]` returns 404 for DRAFT fairs (status check).
- Mobile stacking via CSS media query only — no JS, no resize
  observer, no window.innerWidth.
- Do NOT rebuild anything from v2–v14.
