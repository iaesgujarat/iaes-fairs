# IAES Fairs — Claude Code Prompt v12 (ADDENDUM TO V2–V11)
# Add AFTER v11 is complete.
# Do NOT rebuild anything from v1–v11.
# This addendum adds: Between-Fairs Waitlist Landing Page,
# WaitlistForm, BetweenFairsPage, no-active-fair branch in page.tsx.

---

## CORE CONCEPT

When no fair has is_active = true, the landing page automatically
switches to a "Between Fairs" state. Universities can sign up to be
notified when the next fair opens. All signups flow into the existing
announcement_recipients table — so when admin sends the next
announcement, everyone is already on the list. Zero extra work.

The system is fully automatic. No admin intervention needed between
fairs. August concludes → page switches. December publishes → page
switches back. Nobody needs to touch code.

---

## 1. DATABASE CHANGES

### 1A. Update `announcement_recipients` — Add Source Type

```sql
-- Add NEWSLETTER to the source CHECK constraint
ALTER TABLE announcement_recipients
  DROP CONSTRAINT IF EXISTS announcement_recipients_source_check;

ALTER TABLE announcement_recipients
  ADD CONSTRAINT announcement_recipients_source_check
  CHECK (source IN (
    'PAST_PARTICIPANT',
    'MANUAL',
    'CSV_UPLOAD',
    'NEWSLETTER'      -- ← NEW: between-fairs waitlist signups
  ));
```

### 1B. New Table: `waitlist_signups`

Separate from `announcement_recipients` — stores the raw submission
with extra context before it's merged into the mailing list.

```sql
CREATE TABLE waitlist_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  university_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  country TEXT DEFAULT 'USA',
  source_fair_id UUID REFERENCES fairs(id) ON DELETE SET NULL,
  -- which concluded fair was showing when they signed up
  merged_to_recipients BOOLEAN DEFAULT false,
  -- true once added to announcement_recipients
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX ON waitlist_signups(merged_to_recipients);
CREATE INDEX ON waitlist_signups(created_at);
```

---

## 2. NEW HELPER FUNCTIONS

### `lib/fair.ts` — Add these fetch functions

```typescript
// lib/fair.ts

import { createClient } from '@/lib/supabase/server';
import type { Fair } from '@/types';

// Already exists — fetch active fair
export async function getActiveFair(): Promise<Fair | null> {
  const supabase = createClient();
  const { data: fair } = await supabase
    .from('fairs')
    .select('*')
    .eq('is_active', true)
    .order('fair_date_start', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!fair) return null;

  const { data: itinerary } = await supabase
    .from('fair_itinerary')
    .select('*')
    .eq('fair_id', fair.id)
    .eq('is_public', true)
    .order('sort_order', { ascending: true });

  return { ...fair, itinerary: itinerary ?? [] };
}

// NEW — fetch the most recently concluded fair
export async function getLastConcludedFair(): Promise<Fair | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('fairs')
    .select('*')
    .eq('status', 'COMPLETED')
    .order('concluded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Fair) ?? null;
}

// NEW — fetch all completed fairs for "Past Fairs" list
export async function getPastFairs(): Promise<Fair[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('fairs')
    .select('id, name, fair_date_start, fair_date_end, city,\
             stat_universities_participated, stat_students_attended')
    .eq('status', 'COMPLETED')
    .order('fair_date_start', { ascending: false });
  return (data as Fair[]) ?? [];
}
```

---

## 3. UPDATE: `app/page.tsx`

Full replacement — handles all fair states cleanly:

```typescript
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { FairHero } from '@/components/FairHero';
import { FairDetails } from '@/components/FairDetails';
import { FairCTASection } from '@/components/FairCTASection';
import { BetweenFairsPage } from '@/components/BetweenFairsPage';
import {
  getActiveFair,
  getLastConcludedFair,
  getPastFairs,
} from '@/lib/fair';
import { FALLBACK_FAIR } from '@/lib/fallback';

export const revalidate = 60;

export default async function Home() {
  const fair = await getActiveFair();

  // NO ACTIVE FAIR — show between-fairs waitlist page
  if (!fair) {
    const [lastFair, pastFairs] = await Promise.all([
      getLastConcludedFair(),
      getPastFairs(),
    ]);
    return (
      <>
        <SiteHeader />
        <BetweenFairsPage
          lastFair={lastFair}
          pastFairs={pastFairs}
        />
        <SiteFooter />
      </>
    );
  }

  // ACTIVE FAIR — normal landing page
  const activeFair = fair ?? FALLBACK_FAIR;
  return (
    <>
      <SiteHeader />
      <main>
        <FairHero fair={activeFair} />
        <FairDetails fair={activeFair} />
        <FairCTASection fair={activeFair} />
      </main>
      <SiteFooter />
    </>
  );
}
```

Note: Extract the existing CTA section from `page.tsx` into its own
`FairCTASection.tsx` component to keep `page.tsx` clean.

---

## 4. NEW COMPONENT: `BetweenFairsPage.tsx`

```typescript
// components/BetweenFairsPage.tsx
import { WaitlistForm } from '@/components/WaitlistForm';
import type { Fair } from '@/types';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  });
}

export function BetweenFairsPage({
  lastFair,
  pastFairs,
}: {
  lastFair: Fair | null;
  pastFairs: Fair[];
}) {
  return (
    <main>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">

          {/* IAES identity */}
          <p className="text-xs uppercase tracking-[0.18em] text-gold-400 mb-4">
            Indo American Education Society · Ahmedabad
          </p>
          <h1 className="font-serif text-4xl font-semibold sm:text-5xl">
            IAES Education Fairs
          </h1>
          <p className="mt-4 text-white/70 max-w-xl mx-auto">
            Connecting U.S. universities with Gujarat&rsquo;s brightest
            students through curated outreach tours and open fairs.
          </p>

          {/* Last fair concluded badge */}
          {lastFair && (
            <div className="mt-8 inline-flex items-center gap-2
              rounded-full bg-white/10 border border-white/20
              px-5 py-2 text-sm text-white/80">
              <span className="text-green-400">✓</span>
              {lastFair.name} — Successfully Concluded
              {lastFair.stat_universities_participated && (
                <span className="text-white/50 ml-1">
                  · {lastFair.stat_universities_participated} universities
                  · {lastFair.stat_students_attended?.toLocaleString()} students
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Coming Soon + Waitlist ────────────────────────── */}
      <section className="bg-[#F5F7FA] py-16">
        <div className="mx-auto max-w-2xl px-6">

          {/* Heading */}
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 rounded-full
              bg-gold/20 border border-gold/40 px-4 py-1.5
              text-xs font-semibold text-navy uppercase tracking-wide">
              🔔 Next Fair — Coming Soon
            </span>
            <h2 className="mt-4 font-serif text-3xl font-semibold text-navy">
              Be First in Line
            </h2>
            <p className="mt-3 text-sm text-gray-600 max-w-lg mx-auto">
              Registration for our next fair opens soon. Sign up below
              and you&rsquo;ll be the first to know — with automatic
              early bird pricing when you register.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              {
                icon: '⚡',
                title: 'First Access',
                desc: 'Registration link before public announcement',
              },
              {
                icon: '⭐',
                title: 'Early Bird Rate',
                desc: 'Automatic early bird pricing guaranteed',
              },
              {
                icon: '📋',
                title: 'Priority Booth',
                desc: 'First pick of booth placement at the fair',
              },
            ].map((b) => (
              <div key={b.title}
                className="rounded-xl bg-white border border-navy/10
                  p-4 text-center shadow-sm">
                <span className="text-2xl">{b.icon}</span>
                <p className="mt-2 text-xs font-semibold text-navy">
                  {b.title}
                </p>
                <p className="mt-1 text-xs text-gray-500">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* Waitlist Form */}
          <WaitlistForm />

          {/* Already registered note */}
          <p className="mt-6 text-center text-xs text-gray-400">
            Already participated in a past IAES fair?{' '}
            <span className="font-medium text-navy">
              You&rsquo;re already on our list.
            </span>{' '}
            No need to sign up again.
          </p>
        </div>
      </section>

      {/* ── Past Fairs ────────────────────────────────────── */}
      {pastFairs.length > 0 && (
        <section className="bg-white py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h3 className="font-serif text-xl font-semibold text-navy mb-6">
              Past Fairs
            </h3>
            <div className="space-y-3">
              {pastFairs.map((f) => (
                <div key={f.id}
                  className="flex items-center justify-between
                    rounded-xl border border-navy/10 bg-[#F5F7FA]
                    px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-green-500 text-lg">✓</span>
                    <div>
                      <p className="text-sm font-semibold text-navy">
                        {f.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(f.fair_date_start)} · {f.city}
                      </p>
                    </div>
                  </div>
                  {f.stat_universities_participated && (
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-semibold text-navy">
                        {f.stat_universities_participated} universities
                      </p>
                      <p className="text-xs text-gray-500">
                        {f.stat_students_attended?.toLocaleString()} students
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Contact ───────────────────────────────────────── */}
      <section className="bg-navy py-12 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm text-white/70">
            Questions about upcoming fairs?
          </p>
          <p className="mt-2">
            <a href="mailto:educationfair@iaesgujarat.org"
              className="font-semibold text-gold hover:underline">
              educationfair@iaesgujarat.org
            </a>
            {' · '}
            <a href="tel:+919825593262"
              className="font-semibold text-gold hover:underline">
              +91 9825593262
            </a>
          </p>
        </div>
      </section>

    </main>
  );
}
```

---

## 5. NEW COMPONENT: `WaitlistForm.tsx`

```typescript
// components/WaitlistForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type State = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error';

export function WaitlistForm() {
  const [universityName, setUniversityName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('USA');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          university_name: universityName,
          contact_name: contactName,
          email,
          country,
        }),
      });
      const data = await res.json();

      if (data.alreadySignedUp) {
        setState('duplicate');
      } else if (res.ok) {
        setState('success');
      } else {
        setErrorMsg(data.error ?? 'Something went wrong.');
        setState('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
    }
  }

  // Success state
  if (state === 'success') {
    return (
      <div className="rounded-2xl border border-green-200
        bg-green-50 p-8 text-center">
        <span className="text-4xl">🎉</span>
        <h3 className="mt-3 font-serif text-xl font-semibold text-navy">
          You&rsquo;re on the list!
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          We&rsquo;ll email{' '}
          <span className="font-medium">{email}</span>{' '}
          the moment registration opens — with your early bird
          rate reserved.
        </p>
      </div>
    );
  }

  // Already signed up
  if (state === 'duplicate') {
    return (
      <div className="rounded-2xl border border-gold/30
        bg-gold/5 p-8 text-center">
        <span className="text-4xl">✅</span>
        <h3 className="mt-3 font-serif text-xl font-semibold text-navy">
          Already registered!
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium">{email}</span> is already
          on our mailing list. We&rsquo;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}
      className="rounded-2xl border border-navy/10 bg-white
        p-8 shadow-card space-y-4">

      <Input
        label="University Name*"
        placeholder="Arizona State University"
        required
        value={universityName}
        onChange={(e) => setUniversityName(e.target.value)}
      />

      <Input
        label="Your Name"
        placeholder="Director of International Admissions"
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
      />

      <Input
        type="email"
        label="Email Address*"
        placeholder="admissions@university.edu"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div>
        <label className="text-xs font-medium text-navy/70 uppercase
          tracking-wide mb-1.5 block">
          Country
        </label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full rounded-lg border border-navy/15
            px-3 py-2.5 text-sm text-navy bg-white
            focus:outline-none focus:ring-2 focus:ring-navy/20"
        >
          <option>USA</option>
          <option>Canada</option>
          <option>UK</option>
          <option>Australia</option>
          <option>Germany</option>
          <option>Other</option>
        </select>
      </div>

      {state === 'error' && (
        <p className="text-xs text-red-600">{errorMsg}</p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={state === 'submitting'}
        className="w-full"
      >
        {state === 'submitting'
          ? 'Signing up...'
          : 'Notify Me When Registration Opens →'}
      </Button>

      <p className="text-center text-xs text-gray-400">
        No spam. One email when registration opens. Unsubscribe anytime.
      </p>
    </form>
  );
}
```

---

## 6. NEW API: `/api/waitlist`

```typescript
// app/api/waitlist/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { university_name, contact_name, email, country } = body;

  if (!university_name || !email) {
    return NextResponse.json(
      { error: 'University name and email are required.' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Check announcement_recipients first
  // (past participants already on the list)
  const { data: existing } = await supabase
    .from('announcement_recipients')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ alreadySignedUp: true });
  }

  // Check waitlist_signups
  const { data: existingWaitlist } = await supabase
    .from('waitlist_signups')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (existingWaitlist) {
    return NextResponse.json({ alreadySignedUp: true });
  }

  // Get current concluded fair for context
  const { data: lastFair } = await supabase
    .from('fairs')
    .select('id')
    .eq('status', 'COMPLETED')
    .order('concluded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Insert into waitlist_signups
  const { error: waitlistError } = await supabase
    .from('waitlist_signups')
    .insert({
      university_name,
      contact_name: contact_name || null,
      email: email.toLowerCase().trim(),
      country: country || 'USA',
      source_fair_id: lastFair?.id ?? null,
    });

  if (waitlistError) {
    // Unique constraint — already signed up
    if (waitlistError.code === '23505') {
      return NextResponse.json({ alreadySignedUp: true });
    }
    return NextResponse.json(
      { error: 'Could not save your signup. Please try again.' },
      { status: 500 }
    );
  }

  // Also add to announcement_recipients immediately
  // So they're in the mailing list without admin action
  await supabase
    .from('announcement_recipients')
    .insert({
      email: email.toLowerCase().trim(),
      name: contact_name || university_name,
      organization: university_name,
      source: 'NEWSLETTER',
      is_active: true,
    })
    .onConflict('email')
    .ignore();

  // Mark as merged
  await supabase
    .from('waitlist_signups')
    .update({ merged_to_recipients: true })
    .eq('email', email.toLowerCase().trim());

  return NextResponse.json({ success: true });
}
```

---

## 7. ADMIN: Waitlist View

In `app/admin/dashboard/page.tsx` — add a **Waitlist** tab
alongside University Registrations, Institution Registrations, Fair Day:

```
[University Registrations] [Institution Registrations] [Fair Day] [Waitlist]
```

**Waitlist tab content:**

```
┌──────────────────────────────────────────────────────────┐
│  Waitlist Signups                                        │
│  Universities who signed up between fairs                │
│                                                          │
│  Total: 12 signups  |  All merged to mailing list ✅     │
│                                                          │
│  University            Email           Country  Date     │
│  ─────────────────────────────────────────────────────   │
│  Arizona State         j@asu.edu       USA      18 May   │
│  NYU                   s@nyu.edu       USA      19 May   │
│  ...                                                     │
│                                                          │
│  [Download CSV]                                          │
└──────────────────────────────────────────────────────────┘
```

Show only when `waitlist_signups` has rows.
Otherwise show: "No waitlist signups yet. This tab appears when
universities sign up between fairs."

---

## 8. `lib/fallback.ts` — Extract FALLBACK_FAIR

Move the FALLBACK_FAIR constant out of `page.tsx` into its own file:

```typescript
// lib/fallback.ts
import type { Fair } from '@/types';

export const FALLBACK_FAIR: Fair = {
  // ... existing FALLBACK_FAIR content from page.tsx ...
  // (move it here unchanged)
};
```

Import in `page.tsx`:
```typescript
import { FALLBACK_FAIR } from '@/lib/fallback';
```

This keeps `page.tsx` clean and makes FALLBACK_FAIR reusable.

---

## 9. TYPES — Update `types/index.ts`

```typescript
export interface WaitlistSignup {
  id: string;
  university_name: string;
  contact_name: string | null;
  email: string;
  country: string;
  source_fair_id: string | null;
  merged_to_recipients: boolean;
  created_at: string;
}
```

---

## BUILD ORDER FOR V12 (run after v11 is complete)

1.  SQL: Update `announcement_recipients` source CHECK — add 'NEWSLETTER'
2.  SQL: Create `waitlist_signups` table
3.  Update `types/index.ts` — add WaitlistSignup
4.  Create `lib/fallback.ts` — extract FALLBACK_FAIR from page.tsx
5.  Update `lib/fair.ts` — add getLastConcludedFair() + getPastFairs()
6.  Create `app/api/waitlist/route.ts` — POST handler
7.  Create `components/WaitlistForm.tsx` — waitlist form component
8.  Create `components/BetweenFairsPage.tsx` — full between-fairs page
9.  Extract `components/FairCTASection.tsx` from existing page.tsx CTA
10. Update `app/page.tsx` — no-active-fair branch + clean imports
11. Update `app/admin/dashboard/page.tsx` — add Waitlist tab
12. Update admin waitlist API:
    `GET /api/admin/waitlist` — fetch all signups for admin tab

---

## CRITICAL RULES FOR V12

- When no fair has is_active = true → show BetweenFairsPage
  This is automatic — no admin action needed
- Waitlist signups are immediately added to announcement_recipients
  Admin doesn't need to manually import them before announcing
- Email check covers BOTH waitlist_signups AND announcement_recipients
  A past participant who fills the form sees "Already registered"
  not the success state
- Email stored lowercase + trimmed — no case-sensitivity issues
- The Waitlist tab in admin only shows when rows exist — no empty state clutter
- FALLBACK_FAIR is only shown when fair IS active but DB fetch fails
  It is NOT shown on the between-fairs page
- Between-fairs page shows past fair stats only if
  stat_universities_participated is not null (v10 populates this)
  If null, stats row is hidden gracefully
- Do NOT rebuild anything from v1–v11
