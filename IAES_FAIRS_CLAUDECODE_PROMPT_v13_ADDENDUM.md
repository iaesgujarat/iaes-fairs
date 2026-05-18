# IAES Fairs — Claude Code Prompt v13 (ADDENDUM TO V2–V12)
# Add AFTER v12 is complete.
# Do NOT rebuild anything from v1–v12.
# This addendum adds: Auto-conclude at midnight, stats caching,
# University thank you email, Student thank you email,
# Netlify scheduled function.

---

## CORE CONCEPT

At midnight IST after the fair's end date, a Netlify Scheduled Function
automatically concludes the fair, caches stats, and fires thank you
emails to all confirmed universities and checked-in students.
No manual action required. Admin "Conclude" button remains as
emergency override only.

Midnight IST = 18:30 UTC (previous calendar day).

---

## 1. DATABASE CHANGES

### 1A. Update `fairs` Table — Add Auto-Conclude Tracking

```sql
ALTER TABLE fairs
  ADD COLUMN auto_concluded BOOLEAN DEFAULT false,
  -- true = concluded by cron, false = manual or not yet concluded
  ADD COLUMN thankyou_emails_sent_at TIMESTAMPTZ;
  -- when the thank you blast was sent
```

### 1B. Stats Columns (needed for v10 — add now if not already present)

```sql
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS stat_universities_participated INTEGER,
  ADD COLUMN IF NOT EXISTS stat_students_attended INTEGER,
  ADD COLUMN IF NOT EXISTS stat_booth_scans INTEGER,
  ADD COLUMN IF NOT EXISTS stat_cities_visited INTEGER,
  ADD COLUMN IF NOT EXISTS stat_cached_at TIMESTAMPTZ;
```

---

## 2. NEW NETLIFY SCHEDULED FUNCTION

### File: `netlify/functions/auto-conclude-fair.mts`

```typescript
import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Runs at 00:00 IST = 18:30 UTC every day
export const handler = schedule('30 18 * * *', async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!   // service role — bypasses RLS
  );
  const resend = new Resend(process.env.RESEND_API_KEY!);

  console.log('[auto-conclude] Running at', new Date().toISOString());

  // 1. Find fairs that are ONGOING and whose end date has passed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD

  const { data: fairsToconclude, error } = await supabase
    .from('fairs')
    .select('*')
    .eq('status', 'ONGOING')
    .lt('fair_date_end', todayISO); // end date < today

  if (error) {
    console.error('[auto-conclude] Error fetching fairs:', error);
    return { statusCode: 500 };
  }

  if (!fairsToComplete || fairsToComplete.length === 0) {
    console.log('[auto-conclude] No fairs to conclude today.');
    return { statusCode: 200 };
  }

  for (const fair of fairsToComplete) {
    console.log(`[auto-conclude] Concluding fair: ${fair.name}`);
    await concludeFair(supabase, resend, fair);
  }

  return { statusCode: 200 };
});

// ── Core conclusion logic ─────────────────────────────────────────────────────

async function concludeFair(supabase: any, resend: Resend, fair: any) {

  // STEP 1: Compute and cache stats
  const [
    { count: univCount },
    { count: studentCount },
    { count: scanCount },
    { count: cityCount },
  ] = await Promise.all([
    supabase.from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('fair_id', fair.id)
      .eq('status', 'confirmed'),

    supabase.from('fair_student_passes')
      .select('*', { count: 'exact', head: true })
      .eq('fair_id', fair.id)
      .eq('checked_in', true),

    supabase.from('fair_scans')
      .select('*', { count: 'exact', head: true })
      .eq('fair_id', fair.id),

    supabase.from('institution_registrations')
      .select('city', { count: 'exact', head: true })
      .eq('fair_id', fair.id),
  ]);

  // STEP 2: Update fair status → COMPLETED
  await supabase.from('fairs').update({
    status: 'COMPLETED',
    is_active: false,
    concluded_at: new Date().toISOString(),
    auto_concluded: true,
    stat_universities_participated: univCount ?? 0,
    stat_students_attended: studentCount ?? 0,
    stat_booth_scans: scanCount ?? 0,
    stat_cities_visited: cityCount ?? 0,
    stat_cached_at: new Date().toISOString(),
  }).eq('id', fair.id);

  // STEP 3: Log to fair_status_log
  await supabase.from('fair_status_log').insert({
    fair_id: fair.id,
    from_status: 'ONGOING',
    to_status: 'COMPLETED',
    changed_by: 'system@auto-conclude',
    note: `Auto-concluded at midnight IST. Stats: ${univCount} universities, ${studentCount} students, ${scanCount} scans.`,
  });

  console.log(`[auto-conclude] Fair ${fair.name} concluded. Stats cached.`);

  // STEP 4: Send university thank you emails
  await sendUniversityThankYouEmails(supabase, resend, fair, univCount);

  // STEP 5: Send student thank you emails
  await sendStudentThankYouEmails(supabase, resend, fair);

  // STEP 6: Mark emails sent
  await supabase.from('fairs').update({
    thankyou_emails_sent_at: new Date().toISOString(),
  }).eq('id', fair.id);

  console.log(`[auto-conclude] Thank you emails sent for ${fair.name}.`);
}

// ── University thank you emails ───────────────────────────────────────────────

async function sendUniversityThankYouEmails(
  supabase: any,
  resend: Resend,
  fair: any,
  totalUniversities: number
) {
  // Fetch all confirmed registrations with their scan counts
  const { data: registrations } = await supabase
    .from('registrations')
    .select(`
      id, university_name, contact_name, contact_email,
      fair_id, pricing_tier, total_tables, total_reps
    `)
    .eq('fair_id', fair.id)
    .eq('status', 'confirmed');

  if (!registrations?.length) return;

  for (const reg of registrations) {
    // Get their scan count
    const { count: scansCount } = await supabase
      .from('fair_scans')
      .select('*', { count: 'exact', head: true })
      .eq('university_registration_id', reg.id);

    // Get interested count
    const { count: interestedCount } = await supabase
      .from('fair_scans')
      .select('*', { count: 'exact', head: true })
      .eq('university_registration_id', reg.id)
      .eq('interested', true);

    // Portal link (30-day access)
    const portalLink =
      `${process.env.NEXT_PUBLIC_APP_URL}/portal/${reg.id}/students`;

    try {
      await resend.emails.send({
        from: 'IAES Education Fairs <educationfair@iaesgujarat.org>',
        replyTo: 'educationfair@iaesgujarat.org',
        to: [reg.contact_email],
        subject: `Thank You for Participating — ${fair.name}`,
        react: UniversityThankYouEmail({
          repName: reg.contact_name,
          universityName: reg.university_name,
          fairName: fair.name,
          fairCity: fair.city,
          scansCount: scansCount ?? 0,
          interestedCount: interestedCount ?? 0,
          totalUniversities,
          portalLink,
          portalExpiresAt: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric'
          }),
        }),
      });
    } catch (err) {
      // Log but don't stop — one failure shouldn't block others
      console.error(`[auto-conclude] Email failed for ${reg.contact_email}:`, err);
    }

    // Small delay between sends — Resend rate limit
    await new Promise((r) => setTimeout(r, 200));
  }
}

// ── Student thank you emails ──────────────────────────────────────────────────

async function sendStudentThankYouEmails(
  supabase: any,
  resend: Resend,
  fair: any
) {
  // Only checked-in students who consented to email
  const { data: passes } = await supabase
    .from('fair_student_passes')
    .select('id, pass_uuid, full_name, email, institution_name')
    .eq('fair_id', fair.id)
    .eq('checked_in', true)
    .eq('email_consent', true);

  if (!passes?.length) return;

  for (const pass of passes) {
    // How many booths did this student visit
    const { count: boothsVisited } = await supabase
      .from('fair_scans')
      .select('*', { count: 'exact', head: true })
      .eq('pass_uuid', pass.pass_uuid);

    try {
      await resend.emails.send({
        from: 'IAES Education Fairs <educationfair@iaesgujarat.org>',
        replyTo: 'educationfair@iaesgujarat.org',
        to: [pass.email],
        subject: `Thank You for Attending — ${fair.name}`,
        react: StudentThankYouEmail({
          studentName: pass.full_name,
          institutionName: pass.institution_name,
          fairName: fair.name,
          fairCity: fair.city,
          boothsVisited: boothsVisited ?? 0,
        }),
      });
    } catch (err) {
      console.error(`[auto-conclude] Student email failed for ${pass.email}:`, err);
    }

    await new Promise((r) => setTimeout(r, 200));
  }
}
```

---

## 3. EMAIL TEMPLATES

### `emails/UniversityThankYouEmail.tsx`

```
Subject: Thank You for Participating — IAES Education Fair 2026

Dear [Rep Name],

Thank you for participating in the [Fair Name] in [City].
It was a pleasure having [University Name] as part of our tour.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR BOOTH ENGAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Students who visited your booth:  [N]
Students you marked Interested:   [N]
Universities at the fair:         [N total]

YOUR LEADS PORTAL
Access your complete student list with profiles and your notes.
Portal is available for 30 days (until [date]).

[VIEW YOUR STUDENT LEADS →]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S NEXT:
We will announce the next IAES fair soon.
Past participants receive priority notification and
early bird pricing automatically.

For queries about this fair or the next one:
educationfair@iaesgujarat.org | +91 9825593262

Warm regards,
IAES Team
Indo American Education Society
Ahmedabad, Gujarat, India
```

### `emails/StudentThankYouEmail.tsx`

```
Subject: Thank You for Attending — IAES Education Fair 2026

Dear [Student Name],

Thank you for attending the [Fair Name] in [City].
It was wonderful to see so many bright students from [Institution].

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR FAIR SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
University booths you visited: [N]

The universities you met are reviewing student profiles.
Watch your inbox — they may reach out directly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT FAIR:
You're already on our notification list. ✅
We'll email you when the next fair opens for registration.

Best of luck with your applications!

IAES Team
Indo American Education Society, Ahmedabad
educationfair@iaesgujarat.org | +91 9825593262
```

---

## 4. UPDATE: Admin "Conclude Fair" Button

The button remains but its label and behaviour change slightly:

```typescript
// In GatewayToggle or fair control panel:

// If auto_concluded = true — show info, not button:
{fair.auto_concluded ? (
  <div className="rounded-lg bg-green-50 border border-green-200 p-4">
    <p className="text-sm text-green-800 font-medium">
      ✅ Auto-concluded at midnight IST
    </p>
    <p className="text-xs text-green-700 mt-1">
      Thank you emails sent to{' '}
      {fair.stat_universities_participated} universities
      and {fair.stat_students_attended?.toLocaleString()} students.
    </p>
  </div>
) : (
  // Manual conclude button — emergency override
  <button onClick={handleManualConclude}
    className="...">
    Conclude Fair Manually
  </button>
)}
```

Manual conclude button calls the existing `/api/admin/fairs/[fairId]/conclude` route — update it to also cache stats and send thank you emails (call the same shared logic).

---

## 5. SHARED LOGIC: `lib/concludeFair.ts`

Extract the conclusion logic into a shared function used by BOTH
the cron job AND the manual conclude API route:

```typescript
// lib/concludeFair.ts

export async function concludeFairById(
  supabase: any,
  resend: any,
  fairId: string,
  triggeredBy: 'AUTO' | 'MANUAL',
  adminEmail?: string
) {
  // 1. Fetch fair
  const { data: fair } = await supabase
    .from('fairs')
    .select('*')
    .eq('id', fairId)
    .single();

  if (!fair) throw new Error('Fair not found');
  if (fair.status === 'COMPLETED') throw new Error('Already concluded');

  // 2. Compute stats
  const stats = await computeFairStats(supabase, fairId);

  // 3. Update fair
  await supabase.from('fairs').update({
    status: 'COMPLETED',
    is_active: false,
    concluded_at: new Date().toISOString(),
    auto_concluded: triggeredBy === 'AUTO',
    ...stats,
    stat_cached_at: new Date().toISOString(),
  }).eq('id', fairId);

  // 4. Log
  await supabase.from('fair_status_log').insert({
    fair_id: fairId,
    from_status: fair.status,
    to_status: 'COMPLETED',
    changed_by: triggeredBy === 'AUTO'
      ? 'system@auto-conclude'
      : adminEmail ?? 'admin',
    note: triggeredBy === 'AUTO'
      ? 'Auto-concluded by scheduled function at midnight IST.'
      : 'Manually concluded by admin.',
  });

  // 5. Send emails
  await sendUniversityThankYouEmails(supabase, resend, fair, stats.stat_universities_participated);
  await sendStudentThankYouEmails(supabase, resend, fair);

  // 6. Mark emails sent
  await supabase.from('fairs').update({
    thankyou_emails_sent_at: new Date().toISOString(),
  }).eq('id', fairId);

  return { ...stats, fairName: fair.name };
}

async function computeFairStats(supabase: any, fairId: string) {
  const [
    { count: univCount },
    { count: studentCount },
    { count: scanCount },
    cityResult,
  ] = await Promise.all([
    supabase.from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('fair_id', fairId).eq('status', 'confirmed'),

    supabase.from('fair_student_passes')
      .select('*', { count: 'exact', head: true })
      .eq('fair_id', fairId).eq('checked_in', true),

    supabase.from('fair_scans')
      .select('*', { count: 'exact', head: true })
      .eq('fair_id', fairId),

    supabase.from('institution_registrations')
      .select('city')
      .eq('fair_id', fairId),
  ]);

  const uniqueCities = new Set(
    (cityResult.data ?? []).map((r: any) => r.city)
  ).size;

  return {
    stat_universities_participated: univCount ?? 0,
    stat_students_attended: studentCount ?? 0,
    stat_booth_scans: scanCount ?? 0,
    stat_cities_visited: uniqueCities,
  };
}
```

---

## 6. UPDATE: Manual Conclude API Route

```typescript
// app/api/admin/fairs/[fairId]/conclude/route.ts
// Replace existing logic with shared concludeFairById:

import { concludeFairById } from '@/lib/concludeFair';

export async function POST(request: Request, { params }) {
  // ... auth check ...

  try {
    const result = await concludeFairById(
      supabase,
      resend,
      params.fairId,
      'MANUAL',
      adminUser.email
    );
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 400 }
    );
  }
}
```

---

## 7. `netlify.toml` — Register Scheduled Function

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"

# Scheduled function — auto-conclude fair at midnight IST
[[functions]]
  name = "auto-conclude-fair"
  schedule = "30 18 * * *"
```

---

## 8. ADMIN DASHBOARD — Conclude Status

In the fair control panel (`/admin/fairs/[fairId]/page.tsx`),
update STEP 6 to show auto-conclude status:

```
STEP 6: CONCLUDE FAIR

If status = ONGOING and fair_date_end >= today:
  "Fair is ongoing. Auto-conclusion scheduled for
   midnight IST on [fair_date_end + 1 day]."
  [Conclude Now] ← emergency only, gray/subtle button

If auto_concluded = true:
  ✅ Auto-concluded: [concluded_at formatted]
     Thank you emails: sent to [N] universities + [N] students
     [fair_date_end + 1] at 00:00 IST

If status = COMPLETED and auto_concluded = false:
  ✅ Manually concluded: [concluded_at formatted]
     Thank you emails: [thankyou_emails_sent_at]
```

---

## BUILD ORDER FOR V13 (run after v12 is complete)

1.  SQL: `ALTER TABLE fairs` — add `auto_concluded`, `thankyou_emails_sent_at`
2.  SQL: `ALTER TABLE fairs` — add stat columns (IF NOT EXISTS)
3.  Update `types/index.ts` — add auto_concluded, thankyou_emails_sent_at,
    stat fields to Fair interface
4.  Create `lib/concludeFair.ts` — shared conclusion logic
5.  Create `emails/UniversityThankYouEmail.tsx`
6.  Create `emails/StudentThankYouEmail.tsx`
7.  Create `netlify/functions/auto-conclude-fair.mts` — scheduled function
8.  Update `netlify.toml` — register scheduled function
9.  Update `app/api/admin/fairs/[fairId]/conclude/route.ts`
    — use shared concludeFairById()
10. Update `app/admin/fairs/[fairId]/page.tsx`
    — show auto-conclude status in STEP 6
11. Install if needed: `npm install @netlify/functions`

---

## CRITICAL RULES FOR V13

- Cron runs at 18:30 UTC = 00:00 IST — verify timezone is correct
- Check: fair_date_end < TODAY (strict less than)
  e.g. fair ends 8 Aug → cron runs 9 Aug 00:00 → 8 < 9 = true ✅
  Cron runs 8 Aug 00:00 → 8 < 8 = false ✅ (won't conclude early)
- Email sends use 200ms delay between each — Resend rate limit protection
- Email failure per recipient is caught and logged — never stops the loop
- concludeFairById() checks status !== 'COMPLETED' before running
  Idempotent — safe to call twice, second call throws gracefully
- Only email students where email_consent = true
- University portal link expires 30 days after concluded_at
- Stats are computed BEFORE status update — no race condition
- auto_concluded = true means cron did it; false = manual or not yet
- Do NOT rebuild anything from v1–v12
