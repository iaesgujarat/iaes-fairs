-- =============================================================
-- IAES Fairs — v12: Between-Fairs Waitlist.
-- When no fair is active the landing page shows a waitlist form;
-- signups flow into announcement_recipients so the next
-- announcement reaches them with zero admin work. waitlist_signups
-- keeps the raw submission + extra context.
--
-- Purely additive. Idempotent. Apply manually (SQL Editor).
-- Prereq: 0007 (announcement_recipients) already applied.
-- =============================================================

-- ---------- 1. announcement_recipients: allow NEWSLETTER ------
-- 0007 already lists NEWSLETTER; this re-asserts it idempotently
-- in case an older constraint shape is live on prod.
ALTER TABLE announcement_recipients
  DROP CONSTRAINT IF EXISTS announcement_recipients_source_check;

ALTER TABLE announcement_recipients
  ADD CONSTRAINT announcement_recipients_source_check
  CHECK (source IN (
    'PAST_PARTICIPANT',
    'MANUAL',
    'CSV_UPLOAD',
    'NEWSLETTER'
  ));

-- ---------- 2. waitlist_signups -------------------------------
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  university_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  country TEXT DEFAULT 'USA',
  source_fair_id UUID REFERENCES fairs(id) ON DELETE SET NULL,
  merged_to_recipients BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_merged
  ON waitlist_signups(merged_to_recipients);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created
  ON waitlist_signups(created_at);

-- ---------- 3. RLS --------------------------------------------
-- No anon/authenticated policies: the public form posts through
-- /api/waitlist which uses the service role (bypasses RLS). All
-- admin reads also go through the service role.
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;
