-- =============================================================
-- IAES Fairs — v3 Addendum Migration
--   * Aug 2026 fair fields on `fairs` (multi-day, arrive/depart,
--     early-bird pricing, includes[])
--   * `pricing_tier` on `registrations` (locked at submit)
--   * `institution_registrations` table (no payment flow)
--
-- Additive on top of 0002. Re-runnable: each ALTER is IF NOT
-- EXISTS-style; the table create uses IF NOT EXISTS.
-- Run via Supabase > SQL Editor > paste > Run.
-- =============================================================

-- ---------- 1. Extend `fairs` -----------------------------------
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS fair_date_start DATE,
  ADD COLUMN IF NOT EXISTS fair_date_end DATE,
  ADD COLUMN IF NOT EXISTS arrive_by DATE,
  ADD COLUMN IF NOT EXISTS depart_after DATE,
  ADD COLUMN IF NOT EXISTS price_standard_usd NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_standard_inr NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_earlybird_usd NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_earlybird_inr NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS earlybird_deadline DATE,
  ADD COLUMN IF NOT EXISTS includes TEXT[] DEFAULT '{}';

-- Re-seed the existing fair with real v3 data
UPDATE fairs SET
  name = 'IAES U.S. University Education Fair — August 2026',
  city = 'Ahmedabad',
  venue = 'Ahmedabad (venue TBC)',
  fair_date = '2026-08-06',
  fair_date_start = '2026-08-06',
  fair_date_end = '2026-08-08',
  arrive_by = '2026-08-05',
  depart_after = '2026-08-09',
  registration_deadline = '2026-07-05',
  booth_price_usd = 1700.00,
  price_standard_usd = 1700.00,
  price_standard_inr = 161500.00,
  price_earlybird_usd = 1500.00,
  price_earlybird_inr = 142500.00,
  earlybird_deadline = '2026-06-15',
  includes = ARRAY[
    'Travel to institute visits by cabs arranged by IAES',
    'Logistics and lunch during all days'
  ]
WHERE name IN (
  'EducationUSA India Fair 2025',
  'IAES U.S. University Education Fair — August 2026'
);

-- ---------- 2. Extend `registrations` ---------------------------
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS pricing_tier TEXT NOT NULL DEFAULT 'STANDARD'
    CHECK (pricing_tier IN ('STANDARD', 'EARLYBIRD'));

-- ---------- 3. New table: institution_registrations -------------
CREATE TABLE IF NOT EXISTS institution_registrations (
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
  expected_student_count INTEGER NOT NULL CHECK (expected_student_count >= 1),
  courses TEXT[] NOT NULL DEFAULT '{}',
  year_semester TEXT[] NOT NULL DEFAULT '{}',
  fields_of_interest TEXT[] NOT NULL DEFAULT '{}',
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

CREATE INDEX IF NOT EXISTS idx_inst_reg_fair_id ON institution_registrations(fair_id);
CREATE INDEX IF NOT EXISTS idx_inst_reg_email ON institution_registrations(email);
CREATE INDEX IF NOT EXISTS idx_inst_reg_status ON institution_registrations(status);

-- ---------- 4. RLS on the new table -----------------------------
ALTER TABLE institution_registrations ENABLE ROW LEVEL SECURITY;

-- All writes/reads go through service-role API routes; no anon
-- policies needed. Admins read via service-role too.
