# IAES Fairs — Claude Code Prompt v14 FINAL (ADDENDUM TO V2–V13)
# Add AFTER v13 is complete.
# Do NOT rebuild anything from v1–v13.
# This addendum adds:
# → Premium Booth tier (three-card pricing, slot counter, logo flow)
# → Global add-on table pool (prevents venue overload)
# → Admin controls for all of the above
# → Premium + logo email templates

---

## DESIGN DECISIONS (read before coding anything)

### File Upload for Logo — Email-Based. Not Self-Service.
Max 4 premium universities. Building an upload portal for 4 files
is overengineering. Correct flow:
  1. Premium confirmation email asks university to email PNG logo
     to educationfair@iaesgujarat.org by premium deadline
  2. Admin receives email, downloads PNG
  3. Admin uploads to Supabase Storage via admin dashboard
  4. Admin clicks "Mark Logo Received" → dashboard updates
  5. If no logo after 7 days → auto reminder email fires

### Premium Deadline = Early Bird Deadline
IAES needs 6+ weeks before the fair for:
  → Print ad design and press deadline
  → Backdrop preparation
  → Social media campaign planning
  → Vernacular volunteer sourcing
Premium deadline must = earlybird_deadline. Not normal deadline.

### Add-on Table Pool — Global Cap
Premium universities get 2 tables each from a SEPARATE premium
allocation. Standard/Early Bird universities can add 1 extra table
each from a SHARED pool. Admin sets pool size per fair (default: 6).
When pool hits 0 → extra table option disappears from the form.

### Max 1 Extra Table Per Standard/Early Bird University
Pool is limited. One university buying 2 extra tables leaves only
4 for 20 others. Cap at 1 add-on per non-premium registration.

---

## BUSINESS RULES (hardcoded — never deviate)

```
PREMIUM BOOTH:
  Slots:           4 per fair (admin-configurable)
  Deadline:        = earlybird_deadline (same date)
  Package:         Fixed — 2 tables, 4 reps (no add-ons allowed)
  Price:           USD 2,500
  Deliverables:    Branded backdrop, print ad logo, social media
                   campaign, vernacular volunteer, transport & meals
  Slot counter:    Always shown on premium card ("X of 4 remaining")
  Logo format:     PNG min 300dpi (stated, not validated by system)

ADD-ON TABLES (Standard/Early Bird only):
  Pool:            admin-configurable per fair (default: 6)
  Max per univ:    1 extra table (max 2 tables total per Standard reg)
  Price:           USD 300 per extra table
  Counter:         Shown on BoothConfigurator ("X of 6 remaining")
  Premium exempt:  Premium registrations do NOT use this pool

ADD-ON REPS:
  Max per univ:    2 extra reps (max 4 reps total per Standard reg)
  Price:           USD 100 per extra rep
  No global cap:   Reps don't have a venue capacity constraint
```

---

## 1. DATABASE

### 1A. Update `fairs` Table

```sql
ALTER TABLE fairs
  -- Premium tier
  ADD COLUMN price_premium_usd     NUMERIC(10,2) DEFAULT 2500.00,
  ADD COLUMN price_premium_inr     NUMERIC(10,2),
  ADD COLUMN premium_slots_total   INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN premium_deadline      DATE,

  -- Add-on table pool (Standard/EarlyBird only)
  ADD COLUMN addon_tables_pool     INTEGER NOT NULL DEFAULT 6,
  -- Admin sets this per fair based on venue capacity

  -- Max add-ons per non-premium registration
  ADD COLUMN max_addon_tables_per_reg INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN max_tables_per_university INTEGER NOT NULL DEFAULT 2;
  -- was 3 in v7 — now 2 (1 base + 1 add-on max for Standard)

-- Seed August 2026 fair:
UPDATE fairs SET
  price_premium_usd           = 2500.00,
  price_premium_inr           = 237500.00,
  premium_slots_total         = 4,
  premium_deadline            = '2026-06-15',
  addon_tables_pool           = 6,
  max_addon_tables_per_reg    = 1,
  max_tables_per_university   = 2
WHERE name LIKE '%August 2026%';
```

### 1B. Update `registrations` Table

```sql
-- Expand pricing_tier
ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_pricing_tier_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_pricing_tier_check
  CHECK (pricing_tier IN ('STANDARD', 'EARLYBIRD', 'PREMIUM'));

-- Premium-specific fields
ALTER TABLE registrations
  ADD COLUMN backdrop_png_url        TEXT,
  ADD COLUMN backdrop_received       BOOLEAN DEFAULT false,
  ADD COLUMN backdrop_received_at    TIMESTAMPTZ,
  ADD COLUMN logo_reminder_sent_at   TIMESTAMPTZ;
```

### 1C. Premium Slot Status View

```sql
CREATE OR REPLACE VIEW premium_slot_status AS
SELECT
  f.id AS fair_id,
  f.premium_slots_total,
  COUNT(r.id) FILTER (
    WHERE r.pricing_tier = 'PREMIUM'
    AND   r.status NOT IN ('cancelled')
  ) AS slots_taken,
  f.premium_slots_total - COUNT(r.id) FILTER (
    WHERE r.pricing_tier = 'PREMIUM'
    AND   r.status NOT IN ('cancelled')
  ) AS slots_remaining
FROM fairs f
LEFT JOIN registrations r ON r.fair_id = f.id
GROUP BY f.id, f.premium_slots_total;
```

### 1D. Add-on Table Status View

```sql
CREATE OR REPLACE VIEW addon_table_status AS
SELECT
  f.id AS fair_id,
  f.addon_tables_pool,
  COALESCE(SUM(r.addon_tables), 0) AS tables_taken,
  f.addon_tables_pool - COALESCE(SUM(r.addon_tables), 0) AS tables_remaining
FROM fairs f
LEFT JOIN registrations r
  ON  r.fair_id = f.id
  AND r.status NOT IN ('cancelled')
  AND r.pricing_tier != 'PREMIUM'   -- premium tables are NOT from this pool
GROUP BY f.id, f.addon_tables_pool;
```

### 1E. Table Status Summary View (for admin control panel)

```sql
CREATE OR REPLACE VIEW fair_table_summary AS
SELECT
  f.id AS fair_id,
  f.name AS fair_name,

  -- Premium tables
  COUNT(r.id) FILTER (
    WHERE r.pricing_tier = 'PREMIUM'
    AND   r.status NOT IN ('cancelled')
  ) * 2 AS premium_tables_in_use,

  -- Standard base tables
  COUNT(r.id) FILTER (
    WHERE r.pricing_tier != 'PREMIUM'
    AND   r.status NOT IN ('cancelled')
  ) AS standard_base_tables,

  -- Add-on tables taken
  COALESCE(SUM(r.addon_tables) FILTER (
    WHERE r.pricing_tier != 'PREMIUM'
    AND   r.status NOT IN ('cancelled')
  ), 0) AS addon_tables_taken,

  f.addon_tables_pool AS addon_tables_pool,

  -- Grand total
  COUNT(r.id) FILTER (
    WHERE r.pricing_tier = 'PREMIUM'
    AND   r.status NOT IN ('cancelled')
  ) * 2
  + COUNT(r.id) FILTER (
    WHERE r.pricing_tier != 'PREMIUM'
    AND   r.status NOT IN ('cancelled')
  )
  + COALESCE(SUM(r.addon_tables) FILTER (
    WHERE r.pricing_tier != 'PREMIUM'
    AND   r.status NOT IN ('cancelled')
  ), 0) AS total_tables_in_use

FROM fairs f
LEFT JOIN registrations r ON r.fair_id = f.id
GROUP BY f.id, f.name, f.addon_tables_pool;
```

### 1F. Supabase Storage Bucket

```sql
-- Run in Supabase Dashboard → Storage → Create bucket
-- Bucket name: fair-assets
-- Public: false (private — admin uploads, URLs are signed)
```

---

## 2. TYPES — Update `types/index.ts`

```typescript
export type PricingTier = 'EARLYBIRD' | 'STANDARD' | 'PREMIUM';

// Update Fair interface — add all new fields:
export interface Fair {
  // ... existing fields from v2–v13 ...

  // Premium
  price_premium_usd:          number | null;
  price_premium_inr:          number | null;
  premium_slots_total:        number;
  premium_deadline:           string | null;

  // Add-on table pool
  addon_tables_pool:          number;
  max_addon_tables_per_reg:   number;
  max_tables_per_university:  number;
}

// Update Registration interface:
export interface Registration {
  // ... existing fields ...
  pricing_tier:             PricingTier;
  backdrop_png_url:         string | null;
  backdrop_received:        boolean;
  backdrop_received_at:     string | null;
  logo_reminder_sent_at:    string | null;
}

// New interfaces:
export interface PremiumSlotStatus {
  fair_id:          string;
  premium_slots_total: number;
  slots_taken:      number;
  slots_remaining:  number;
  isSoldOut:        boolean;
}

export interface AddonTableStatus {
  fair_id:              string;
  addon_tables_pool:    number;
  tables_taken:         number;
  tables_remaining:     number;
  isPoolExhausted:      boolean;
}

export interface FairTableSummary {
  fair_id:                  string;
  premium_tables_in_use:    number;
  standard_base_tables:     number;
  addon_tables_taken:       number;
  addon_tables_pool:        number;
  total_tables_in_use:      number;
}
```

---

## 3. UPDATE: `lib/pricing.ts`

```typescript
// lib/pricing.ts — full replacement

export type PricingTier = 'EARLYBIRD' | 'STANDARD' | 'PREMIUM';

export interface ActivePricingState {
  earlyBirdActive:    boolean;   // before earlybird_deadline
  standardActive:     boolean;   // before registration_deadline
  premiumActive:      boolean;   // before premium_deadline

  // What to show on the three-card layout:
  showEarlyBird:      boolean;   // true = show, false = hide (deadline passed)
  showStandard:       boolean;   // always shown while reg open
  showPremium:        boolean;   // true = show, false = hide (deadline passed)
  standardIsPassive:  boolean;   // true during early bird period
}

export function getActivePricingState(fair: {
  earlybird_deadline:     string | null;
  premium_deadline:       string | null;
  registration_deadline:  string | null;
}): ActivePricingState {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const before = (d: string | null) =>
    d !== null && today <= new Date(d);

  const earlyBirdActive   = before(fair.earlybird_deadline);
  const premiumActive     = before(fair.premium_deadline);
  const standardActive    = before(fair.registration_deadline);

  return {
    earlyBirdActive,
    standardActive,
    premiumActive,
    showEarlyBird:    earlyBirdActive,
    showStandard:     standardActive,
    showPremium:      premiumActive,
    standardIsPassive: earlyBirdActive,
    // During early bird: Standard card shown but not clickable
  };
}

// Booth pricing — only for Standard/EarlyBird
// Premium is always a flat USD 2,500 — no calculation needed
export function calculateBoothPricing(config: {
  totalTables:  number;
  totalReps:    number;
}, fair: {
  price_standard_usd:      number;
  price_earlybird_usd:     number | null;
  earlybird_deadline:      string | null;
  price_extra_table_usd:   number;
  price_extra_rep_usd:     number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isEarlyBird =
    fair.price_earlybird_usd !== null &&
    fair.earlybird_deadline !== null &&
    today <= new Date(fair.earlybird_deadline);

  const basePrice = isEarlyBird
    ? fair.price_earlybird_usd!
    : fair.price_standard_usd;

  const addonTables  = Math.max(0, config.totalTables - 1);
  const addonReps    = Math.max(0, config.totalReps - 2);

  const addonTablesCost = addonTables * fair.price_extra_table_usd;
  const addonRepsCost   = addonReps   * fair.price_extra_rep_usd;
  const addonTotal      = addonTablesCost + addonRepsCost;

  return {
    tier:             isEarlyBird ? 'EARLYBIRD' : 'STANDARD' as PricingTier,
    basePrice,
    addonTables,
    addonReps,
    addonTablesCost,
    addonRepsCost,
    addonTotal,
    grandTotal:       basePrice + addonTotal,
  };
}
```

---

## 4. NEW API ROUTES

### `GET /api/fairs/[fairId]/premium-slots`
```typescript
// Returns PremiumSlotStatus — used by PricingCards component
const { data } = await supabase
  .from('premium_slot_status')
  .select('*')
  .eq('fair_id', params.fairId)
  .single();

return NextResponse.json({
  total:       data.premium_slots_total,
  taken:       data.slots_taken,
  remaining:   data.slots_remaining,
  isSoldOut:   data.slots_remaining <= 0,
});
```

### `GET /api/fairs/[fairId]/addon-table-status`
```typescript
// Returns AddonTableStatus — used by BoothConfigurator
const { data } = await supabase
  .from('addon_table_status')
  .select('*')
  .eq('fair_id', params.fairId)
  .single();

return NextResponse.json({
  pool:             data.addon_tables_pool,
  taken:            data.tables_taken,
  remaining:        data.tables_remaining,
  isPoolExhausted:  data.tables_remaining <= 0,
});
```

### `POST /api/admin/registrations/[registrationId]/logo`
```typescript
// Accepts multipart/form-data with 'file' field
// 1. Validate: image file, < 20MB
// 2. Upload to Supabase Storage:
//    bucket: 'fair-assets'
//    path:   logos/[registrationId]/logo.png
// 3. Get signed URL (valid 1 year)
// 4. Update registrations:
//    backdrop_png_url = signedUrl
//    backdrop_received = true
//    backdrop_received_at = NOW()
// 5. Send LogoReceivedEmail to university contact
// 6. Return { success: true, url: signedUrl }
```

### `POST /api/admin/registrations/[registrationId]/send-logo-reminder`
```typescript
// 1. Fetch registration — confirm pricing_tier = 'PREMIUM'
//    and backdrop_received = false
// 2. Send LogoReminderEmail
// 3. Update logo_reminder_sent_at = NOW()
// 4. Return { success: true }
```

---

## 5. NEW COMPONENT: `PricingCards.tsx`

Three-card layout. Manages all active/passive/sold-out states.
Fetches live slot counts on mount.

```typescript
// components/RegistrationForm/PricingCards.tsx
'use client';

import { useState, useEffect } from 'react';
import { getActivePricingState } from '@/lib/pricing';
import type { Fair, PricingTier,
  PremiumSlotStatus } from '@/types';

export function PricingCards({
  fair,
  selectedTier,
  onSelect,
}: {
  fair: Fair;
  selectedTier: PricingTier | null;
  onSelect: (tier: PricingTier) => void;
}) {
  const [premiumSlots, setPremiumSlots] =
    useState<PremiumSlotStatus | null>(null);

  useEffect(() => {
    fetch(`/api/fairs/${fair.id}/premium-slots`)
      .then(r => r.json())
      .then(setPremiumSlots);
  }, [fair.id]);

  const state = getActivePricingState(fair);

  function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN',
      { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase
        tracking-[0.15em] text-navy/60">
        Select Booth Type
      </p>

      <div className="grid gap-4 sm:grid-cols-3">

        {/* ── EARLY BIRD ─────────────────────────────── */}
        {state.showEarlyBird && (
          <button type="button"
            onClick={() => onSelect('EARLYBIRD')}
            className={`relative rounded-2xl border-2 p-5 text-left
              transition-all hover:shadow-md
              ${selectedTier === 'EARLYBIRD'
                ? 'border-navy bg-navy text-white'
                : 'border-gold/50 bg-gold/5 hover:border-gold'
              }`}
          >
            <span className="inline-flex items-center rounded-full
              bg-gold px-2.5 py-0.5 text-[10px] font-bold
              text-navy mb-3">
              ⭐ EARLY BIRD
            </span>

            <p className="text-2xl font-bold">
              USD {fair.price_earlybird_usd?.toLocaleString()}
            </p>
            <p className="text-xs opacity-60 mt-0.5">
              Ends {formatDate(fair.earlybird_deadline)}
            </p>

            <ul className="mt-4 space-y-1.5 text-xs opacity-80">
              <li>✓ 1 table (add 1 more for +$300)</li>
              <li>✓ 2 reps (add up to 2 more for +$100 each)</li>
              <li>✓ Fair directory listing</li>
              <li>✓ Transport & meals included</li>
            </ul>
          </button>
        )}

        {/* ── STANDARD ───────────────────────────────── */}
        {state.showStandard && (
          <div
            role={state.standardIsPassive ? undefined : 'button'}
            onClick={() =>
              !state.standardIsPassive && onSelect('STANDARD')
            }
            className={`relative rounded-2xl border-2 p-5 text-left
              transition-all
              ${state.standardIsPassive
                ? 'border-gray-200 bg-gray-50 opacity-55 cursor-not-allowed'
                : selectedTier === 'STANDARD'
                  ? 'border-navy bg-navy text-white cursor-pointer'
                  : 'border-navy/20 bg-white hover:border-navy hover:shadow-md cursor-pointer'
              }`}
          >
            <span className={`inline-flex items-center rounded-full
              px-2.5 py-0.5 text-[10px] font-semibold mb-3
              ${state.standardIsPassive
                ? 'bg-gray-200 text-gray-500'
                : 'bg-navy/10 text-navy'}`}
            >
              {state.standardIsPassive
                ? `Opens ${formatDate(fair.earlybird_deadline)}`
                : 'STANDARD'}
            </span>

            <p className="text-2xl font-bold text-navy">
              USD {fair.price_standard_usd?.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Until {formatDate(fair.registration_deadline)}
            </p>

            <ul className="mt-4 space-y-1.5 text-xs text-gray-500">
              <li>✓ 1 table (add 1 more for +$300)</li>
              <li>✓ 2 reps (add up to 2 more for +$100 each)</li>
              <li>✓ Fair directory listing</li>
              <li>✓ Transport & meals included</li>
            </ul>
          </div>
        )}

        {/* ── PREMIUM ────────────────────────────────── */}
        {state.showPremium && (
          <button type="button"
            disabled={premiumSlots?.isSoldOut ?? false}
            onClick={() => onSelect('PREMIUM')}
            className={`relative rounded-2xl border-2 p-5 text-left
              transition-all
              ${premiumSlots?.isSoldOut
                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                : selectedTier === 'PREMIUM'
                  ? 'border-gold bg-navy text-white'
                  : 'border-gold/60 bg-gradient-to-br from-navy/5 to-gold/10 hover:border-gold hover:shadow-md'
              }`}
          >
            <span className="inline-flex items-center rounded-full
              bg-gold px-2.5 py-0.5 text-[10px] font-bold
              text-navy mb-3">
              💎 PREMIUM
            </span>

            <p className="text-2xl font-bold text-navy">
              USD {fair.price_premium_usd?.toLocaleString()}
            </p>

            {/* Live slot counter */}
            <p className={`text-xs font-semibold mt-1
              ${premiumSlots?.isSoldOut
                ? 'text-red-600'
                : (premiumSlots?.remaining ?? 4) === 1
                  ? 'text-red-500'
                  : 'text-gold-700'}`}
            >
              {premiumSlots
                ? premiumSlots.isSoldOut
                  ? '⛔ Sold Out'
                  : `${premiumSlots.remaining} of ${premiumSlots.total} slots remaining`
                : `${fair.premium_slots_total} slots available`
              }
            </p>

            <ul className="mt-4 space-y-1.5 text-xs text-navy/75">
              <li>✓ <strong>2 tables</strong> (no add-ons needed)</li>
              <li>✓ <strong>4 representatives</strong></li>
              <li>✓ Branded backdrop at booth</li>
              <li>✓ Logo in print advertisements</li>
              <li>✓ Dedicated social media campaign</li>
              <li>✓ Vernacular language volunteer</li>
              <li>✓ Transport & meals included</li>
            </ul>

            <p className="mt-3 text-[10px] text-gray-400">
              Closes {formatDate(fair.premium_deadline)}
            </p>
          </button>
        )}
      </div>

      {/* Premium logo warning */}
      {selectedTier === 'PREMIUM' && (
        <div className="rounded-xl border border-gold/30
          bg-gold/5 px-4 py-3 text-xs text-navy/80">
          <strong>Logo required:</strong> After registering, email
          your university logo (PNG, min 300dpi) to{' '}
          <a href="mailto:educationfair@iaesgujarat.org"
            className="underline font-medium">
            educationfair@iaesgujarat.org
          </a>{' '}
          by {formatDate(fair.premium_deadline)}.
        </div>
      )}
    </div>
  );
}
```

---

## 6. UPDATE: `BoothConfigurator.tsx`

Add live add-on table pool counter. Only shown for
Standard/EarlyBird — hidden completely when Premium selected.

```typescript
// components/RegistrationForm/BoothConfigurator.tsx

// Add to props:
fairId: string;
maxAddonTablesPerReg: number;  // from fair.max_addon_tables_per_reg (= 1)

// Add state:
const [addonTableStatus, setAddonTableStatus] =
  useState<AddonTableStatus | null>(null);

useEffect(() => {
  fetch(`/api/fairs/${fairId}/addon-table-status`)
    .then(r => r.json())
    .then(setAddonTableStatus);
}, [fairId]);

// Table stepper max:
const tableStepperMax = Math.min(
  1 + (addonTableStatus?.isPoolExhausted ? 0 : maxAddonTablesPerReg),
  // 1 base + up to maxAddonTablesPerReg extra (if pool not exhausted)
  fair.max_tables_per_university  // absolute cap
);

// In the table stepper section — add counter below:
{addonTableStatus && (
  <div className={`text-xs font-medium mt-1
    ${addonTableStatus.isPoolExhausted
      ? 'text-red-600'
      : addonTableStatus.remaining === 1
        ? 'text-orange-500'
        : 'text-gray-400'}`}
  >
    {addonTableStatus.isPoolExhausted
      ? '⛔ No additional tables available for this fair'
      : `${addonTableStatus.remaining} of ${addonTableStatus.pool} extra table slots remaining`
    }
  </div>
)}
```

---

## 7. UPDATE: Registration Form Step 1

```typescript
// components/RegistrationForm/Step1University.tsx

// REMOVE: Old booth_type radio (Standard/Premium)
// ADD: PricingCards component at top of Step 1
// KEEP: BoothConfigurator — but conditional

const [selectedTier, setSelectedTier] =
  useState<PricingTier | null>(null);

const isPremium = selectedTier === 'PREMIUM';

// When PREMIUM selected:
useEffect(() => {
  if (isPremium) {
    setValue('pricing_tier',  'PREMIUM');
    setValue('total_tables',  2);
    setValue('total_reps',    4);
    setValue('addon_tables',  0);   // premium has no add-ons
    setValue('addon_reps',    0);
    setValue('addon_cost_usd', 0);
    setValue('grand_total_usd', fair.price_premium_usd);
  }
}, [isPremium]);

// Render:
<PricingCards
  fair={fair}
  selectedTier={selectedTier}
  onSelect={setSelectedTier}
/>

{/* Only show configurator for Standard/EarlyBird */}
{selectedTier && !isPremium && (
  <BoothConfigurator
    fairId={fair.id}
    basePriceUSD={activePriceUSD}
    priceExtraTableUSD={fair.price_extra_table_usd}
    priceExtraRepUSD={fair.price_extra_rep_usd}
    maxAddonTablesPerReg={fair.max_addon_tables_per_reg}
    maxTablesPerUniversity={fair.max_tables_per_university}
    onChange={setBoothConfig}
  />
)}
```

---

## 8. UPDATE: `/api/register` Route

Server-side validation for both premium slots and add-on table pool:

```typescript
// Fetch fair with pricing
const { data: fair } = await supabase
  .from('fairs')
  .select('*')
  .eq('id', body.fair_id)
  .single();

if (body.pricing_tier === 'PREMIUM') {
  // Check premium deadline
  if (new Date() > new Date(fair.premium_deadline)) {
    return NextResponse.json(
      { error: 'Premium registration deadline has passed.' },
      { status: 400 }
    );
  }

  // Atomic slot check
  const { data: slots } = await supabase
    .from('premium_slot_status')
    .select('slots_remaining')
    .eq('fair_id', body.fair_id)
    .single();

  if (!slots || slots.slots_remaining <= 0) {
    return NextResponse.json(
      { error: 'Premium booth is sold out. Please select Standard.' },
      { status: 400 }
    );
  }

  // Override — premium is always 2 tables, 4 reps, flat price
  body.total_tables   = 2;
  body.total_reps     = 4;
  body.addon_tables   = 0;
  body.addon_reps     = 0;
  body.addon_cost_usd = 0;
  body.grand_total_usd = fair.price_premium_usd;

} else {
  // Standard/EarlyBird — validate add-on table pool
  if (body.addon_tables > 0) {
    // Enforce max 1 add-on table per non-premium registration
    if (body.addon_tables > fair.max_addon_tables_per_reg) {
      return NextResponse.json(
        { error: `Maximum ${fair.max_addon_tables_per_reg} extra table(s) allowed.` },
        { status: 400 }
      );
    }

    // Check pool availability
    const { data: pool } = await supabase
      .from('addon_table_status')
      .select('tables_remaining')
      .eq('fair_id', body.fair_id)
      .single();

    if (!pool || pool.tables_remaining < body.addon_tables) {
      return NextResponse.json(
        { error: 'Extra table slots are fully booked for this fair.' },
        { status: 400 }
      );
    }
  }

  // Recalculate pricing server-side (never trust client total)
  const pricing = calculateBoothPricing(
    { totalTables: body.total_tables, totalReps: body.total_reps },
    fair
  );
  body.pricing_tier    = pricing.tier;
  body.grand_total_usd = pricing.grandTotal;
  body.addon_tables    = pricing.addonTables;
  body.addon_reps      = pricing.addonReps;
  body.addon_cost_usd  = pricing.addonTotal;
}

// Send appropriate email based on tier:
if (body.pricing_tier === 'PREMIUM') {
  await sendPremiumConfirmationEmail(registration, proformaRef, fair);
} else {
  await sendProformaEmail(registration, proformaRef, fair);
}
```

---

## 9. EMAIL TEMPLATES

### `emails/PremiumConfirmationEmail.tsx`

```
Subject: 💎 Premium Booth Reserved — IAES Fair 2026 | Ref: PI-2026-XXXX

Dear [Rep Name],

Congratulations! Your Premium Booth at the
IAES U.S. University Education Outreach Tour & Fair,
August 2026 is reserved.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR PREMIUM BOOTH PACKAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓  2 Counter spaces / tables
✓  4 University representatives
✓  Branded backdrop displayed at your booth
✓  Large logo in IAES print advertisements
✓  Prominent feature in IAES print media
✓  Dedicated social media campaign for [University Name]
✓  Vernacular language volunteer at your desk
✓  Transport and meals for all tour days
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROFORMA INVOICE:
  Reference:  PI-2026-XXXX
  Amount:     USD 2,500
  Payment gateway opens shortly — you will be notified.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  ACTION REQUIRED — LOGO SUBMISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To activate your branded backdrop and print ad placement:

  Email to:   educationfair@iaesgujarat.org
  Subject:    Logo — [University Name] — PI-2026-XXXX
  Format:     PNG file · minimum 300dpi
              Transparent background preferred
  Deadline:   [premium_deadline]

Late or missing logo = print ad may not be possible.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? We are here.
educationfair@iaesgujarat.org | +91 9825593262

IAES Team
Indo American Education Society, Ahmedabad
```

### `emails/LogoReminderEmail.tsx`

Auto-fired 7 days after premium registration if logo not received.

```
Subject: ⏰ Logo Still Pending — IAES Fair 2026 | [University Name]

Dear [Rep Name],

We haven't received your university logo yet for your
Premium Booth at the IAES U.S. University Education Fair 2026.

Your logo enables:
  → Branded backdrop at your booth
  → Large logo in IAES print advertisements
  → Dedicated social media campaign feature

Please email it as soon as possible:

  To:      educationfair@iaesgujarat.org
  Subject: Logo — [University Name] — [Proforma Ref]
  Format:  PNG · min 300dpi · transparent background preferred
  By:      [premium_deadline]

Need help? Call us: +91 9825593262

IAES Team
```

### `emails/LogoReceivedEmail.tsx`

Sent when admin marks logo as received.

```
Subject: ✅ Logo Confirmed — IAES Fair 2026 | [University Name]

Dear [Rep Name],

We have received your university logo. Thank you!

Your Premium Booth is now fully set up:
✓  Booth: 2 tables · 4 reps
✓  Branded backdrop — logo confirmed ✅
✓  Print ad placement — logo queued ✅
✓  Social media campaign — in preparation
✓  Vernacular volunteer — being arranged

We will share your complete fair briefing
4 weeks before the event.

See you in Ahmedabad!

IAES Team
Indo American Education Society
educationfair@iaesgujarat.org | +91 9825593262
```

---

## 10. INVOICE / PROFORMA — Premium Format

Premium uses a single flat-fee line item with deliverables listed.
NOT the per-item breakdown used for Standard/EarlyBird.

In `lib/invoice.ts` — detect `pricing_tier === 'PREMIUM'`
and switch format:

```typescript
// Premium invoice line items:
const premiumLineItems = [
  {
    sacCode: '998596',
    description: `Premium Booth — ${fair.name}\n` +
      `Includes: 2 Tables · 4 Representatives · Branded Backdrop · ` +
      `Print Ad Placement · Social Media Campaign · ` +
      `Vernacular Volunteer · Transport & Meals`,
    amountUSD: registration.grand_total_usd,
    amountINR: invoice.total_amount_inr,
  }
];
// One line. Clean. Reflects premium positioning.

// Standard invoice line items (unchanged from v7):
// Base + extra tables + extra reps as separate lines
```

---

## 11. ADMIN CONTROLS

### 11A. Premium Status Card — Fair Control Panel

In `app/admin/fairs/[fairId]/page.tsx`:

```
PREMIUM BOOTH STATUS
──────────────────────────────────────────────────────
Slots: 2 of 4 taken  |  2 remaining
Price: USD 2,500  |  Deadline: 15 June 2026

  University         Logo         Amount    Status
  ────────────────────────────────────────────────
  ASU                ✅ Received   $2,500   Registered
  NYU                ⏳ Pending    $2,500   Registered
                     [Send Reminder]
  [+ 2 slots remaining]

[Override Slot Limit +1]  ← adds 1 to premium_slots_total
                             requires confirmation + reason
```

### 11B. Table Pool Status Card — Fair Control Panel

```
TABLE POOL STATUS
──────────────────────────────────────────────────────
Premium tables:          8    (4 slots × 2 per premium)
Standard base:          18    (18 confirmed registrations)
Add-on tables taken:     3    of 6 pool
──────────────────────────────────────────────────────
Total tables in use:    29
```

### 11C. Dashboard Filter

In `app/admin/dashboard/page.tsx` University Registrations tab:

```
Filter: All | Early Bird | Standard | Premium | ⏳ Logo Pending
```

**Premium registrations show extra columns:**
| University | Contact | Tables | Reps | Logo | Amount | Status |
|---|---|---|---|---|---|---|
| ASU | Janet | 2 | 4 | ✅ | $2,500 | Registered |
| NYU | John | 2 | 4 | ⏳ [Remind] | $2,500 | Registered |

### 11D. Individual Registration — Premium Detail View

When admin opens a premium registration:

```
PREMIUM BOOTH DETAILS
──────────────────────────────────────────────────────
Tier:     💎 PREMIUM
Tables:   2  |  Reps: 4
Amount:   USD 2,500

LOGO STATUS
──────────────────────────────────────────────────────
Status:   ⏳ Awaiting logo
Deadline: 15 June 2026

[Upload Logo (PNG)]      ← admin uploads received PNG
[Send Logo Reminder]     ← fires LogoReminderEmail

PREMIUM DELIVERABLES CHECKLIST
──────────────────────────────────────────────────────
□ Logo received
□ Backdrop ordered / printed
□ Print ad sent to designer
□ Social media campaign briefed
□ Vernacular volunteer assigned
```

### 11E. Admin Fair Edit — Pricing Section

In `app/admin/fairs/[fairId]/edit/page.tsx`:

```
STANDARD PRICING
  Standard Rate (USD)   [  1700  ]
  Standard Rate (INR)   [  161500  ]
  Extra Table           [  300  ] USD
  Extra Rep             [  100  ] USD

EARLY BIRD PRICING
  Early Bird Rate (USD) [  1500  ]
  Early Bird Rate (INR) [  142500  ]
  Early Bird Deadline   [  2026-06-15  ]

PREMIUM BOOTH
  Premium Rate (USD)    [  2500  ]
  Premium Rate (INR)    [  237500  ]
  Premium Slots Total   [  4  ]
  Premium Deadline      [  2026-06-15  ]
  ⚠️  Set = Early Bird deadline (logistics require 6+ weeks prep)

TABLE POOL (Standard / Early Bird only)
  Add-on Tables Pool    [  6  ]
  (Extra tables available across all non-premium registrations)
  Max add-on per univ   [  1  ]
  ──────────────────────────────────────
  ℹ️  Premium tables are separate and do not use this pool.
     Premium uses 8 tables (4 slots × 2). Add-on pool is for
     Standard/Early Bird upgrades only.
```

---

## 12. AUTO LOGO REMINDER — Add to Cron

In `netlify/functions/auto-conclude-fair.mts`,
add `sendPendingLogoReminders()` call at the top
(runs daily alongside auto-conclude check):

```typescript
async function sendPendingLogoReminders(
  supabase: any,
  resend: Resend
) {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: pending } = await supabase
    .from('registrations')
    .select('*, fairs(premium_deadline, name)')
    .eq('pricing_tier', 'PREMIUM')
    .eq('backdrop_received', false)
    .is('logo_reminder_sent_at', null)
    .lt('created_at', sevenDaysAgo)
    .not('status', 'eq', 'cancelled');

  for (const reg of (pending ?? [])) {
    // Skip if premium deadline already passed
    if (new Date() > new Date(reg.fairs.premium_deadline)) continue;

    try {
      await resend.emails.send({
        from: 'IAES Education Fairs <educationfair@iaesgujarat.org>',
        replyTo: 'educationfair@iaesgujarat.org',
        to: [reg.contact_email],
        subject: `⏰ Logo Still Pending — ${reg.fairs.name} | ${reg.university_name}`,
        react: LogoReminderEmail({ reg }),
      });

      await supabase.from('registrations')
        .update({ logo_reminder_sent_at: new Date().toISOString() })
        .eq('id', reg.id);

    } catch (err) {
      console.error(`Logo reminder failed for ${reg.contact_email}:`, err);
    }

    await new Promise(r => setTimeout(r, 200));
  }
}
```

---

## BUILD ORDER FOR V14

1.  SQL: `ALTER TABLE fairs` — all premium + pool columns
2.  SQL: `ALTER TABLE registrations` — pricing_tier + premium fields
3.  SQL: Create `premium_slot_status` view
4.  SQL: Create `addon_table_status` view
5.  SQL: Create `fair_table_summary` view
6.  SQL: Update seeded August 2026 fair with all new values
7.  SQL: Create Supabase Storage bucket `fair-assets`
8.  Update `types/index.ts` — all new types
9.  Update `lib/pricing.ts` — full replacement
10. Create `app/api/fairs/[fairId]/premium-slots/route.ts`
11. Create `app/api/fairs/[fairId]/addon-table-status/route.ts`
12. Create `components/RegistrationForm/PricingCards.tsx`
13. Update `components/RegistrationForm/BoothConfigurator.tsx`
    — add live add-on table counter
14. Update `components/RegistrationForm/Step1University.tsx`
    — replace booth type with PricingCards, conditional configurator
15. Update `app/api/register/route.ts`
    — premium + pool validation, tier-based email routing
16. Create `emails/PremiumConfirmationEmail.tsx`
17. Create `emails/LogoReminderEmail.tsx`
18. Create `emails/LogoReceivedEmail.tsx`
19. Create `app/api/admin/registrations/[id]/logo/route.ts`
20. Create `app/api/admin/registrations/[id]/send-logo-reminder/route.ts`
21. Update `components/InvoiceView/InvoiceUSD.tsx`
    — detect PREMIUM tier → single flat-fee line item
22. Update `components/InvoiceView/InvoiceINR.tsx` — same
23. Update `components/InvoiceView/ProformaInvoicePDF.tsx` — same
24. Update `app/admin/dashboard/page.tsx`
    — premium filter, logo column, table columns
25. Update `app/admin/fairs/[fairId]/page.tsx`
    — premium status card + table pool status card
26. Update `app/admin/fairs/[fairId]/edit/page.tsx`
    — full pricing section including premium + pool fields
27. Update `netlify/functions/auto-conclude-fair.mts`
    — add sendPendingLogoReminders() call

---

## CRITICAL RULES FOR V14

- Premium = fixed package. No BoothConfigurator shown for premium.
  total_tables=2, total_reps=4 set server-side, not trusted from client.
- Add-on table pool excludes premium registrations entirely.
  Premium tables come from premium_slots allocation, not addon_tables_pool.
- Max 1 add-on table per Standard/EarlyBird registration
  (max_tables_per_university = 2, was 3 in v7 — override it).
- Both slot checks (premium + add-on pool) are server-side atomic.
  Client counters are for UX only — server is the source of truth.
- Premium deadline must = earlybird_deadline. Admin form should warn
  if admin tries to set a later date.
- Logo collection is email-based — universities email PNG,
  admin uploads to Supabase Storage, marks received in dashboard.
- PremiumConfirmationEmail replaces ProformaEmail when tier = PREMIUM.
- Logo reminder auto-fires at 7 days after registration if not received
  AND premium deadline has not yet passed.
- Premium invoice = single flat-fee line item with deliverables.
  Standard/EarlyBird invoice = itemised lines (unchanged from v7).
- Standard card is PASSIVE (div not button, cursor-not-allowed)
  during early bird period — rendered but not selectable.
- Do NOT rebuild anything from v1–v13.
