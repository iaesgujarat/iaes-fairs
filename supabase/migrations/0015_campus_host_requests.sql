-- =============================================================
-- IAES Fairs — v9: Campus Host Requests (Indian HEI invites
-- foreign university reps to visit their campus)
--
--   * Adds campus_host_requests_active toggle on fairs
--     (mirrors the payment_gateway_active idiom — admin-gated)
--   * New table campus_host_requests (no payment flow)
--
-- Purely additive. Re-runnable: IF NOT EXISTS / IF EXISTS guards.
-- Run via Supabase > SQL Editor > paste > Run.
-- =============================================================

-- ---------- 1. Extend `fairs` (admin activation toggle) ---------
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS campus_host_requests_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS campus_host_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS campus_host_activation_note TEXT;

-- Seeded fair starts with the programme OFF (explanatory message shown).
UPDATE fairs
SET campus_host_requests_active = false
WHERE name = 'IAES U.S. University Education Fair — August 2026'
  AND campus_host_requests_active IS NOT TRUE;

-- ---------- 2. New table: campus_host_requests ------------------
CREATE TABLE IF NOT EXISTS campus_host_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) NOT NULL,

  -- Institution official (point of contact)
  official_name TEXT NOT NULL,
  official_email TEXT NOT NULL,
  official_phone TEXT NOT NULL,

  -- Institution
  institution_name TEXT NOT NULL,
  website TEXT,

  -- Programme intent
  study_programs TEXT[] NOT NULL DEFAULT '{}',
  approx_participants TEXT NOT NULL,   -- free text, e.g. "100+"
  proposed_datetime TEXT NOT NULL,     -- free text, e.g. "2nd week Aug 2026, afternoon"

  -- Terms
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,

  -- Workflow (admin-managed)
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'scheduled', 'declined', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campus_host_fair_id ON campus_host_requests(fair_id);
CREATE INDEX IF NOT EXISTS idx_campus_host_email ON campus_host_requests(official_email);
CREATE INDEX IF NOT EXISTS idx_campus_host_status ON campus_host_requests(status);

-- ---------- 3. RLS on the new table -----------------------------
ALTER TABLE campus_host_requests ENABLE ROW LEVEL SECURITY;

-- All writes/reads go through service-role API routes; no anon
-- policies needed. Admins read via service-role too. RLS stays ON
-- so the public anon key (shipped in the browser bundle) can never
-- read or write this table directly.
