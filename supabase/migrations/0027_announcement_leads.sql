-- =============================================================
-- IAES Fairs — v21: public "subscribe for future events" leads.
--
-- A self-serve, role-aware opt-in (NOT tied to a fair registration):
-- universities and students leave their details + WhatsApp/email consent
-- so we can announce future fairs to them. Builds a standing, growing
-- announcement audience over time. WA-consented numbers are ALSO mirrored
-- into whatsapp_contacts by the API (reusing STOP/unsubscribe handling),
-- so the WhatsApp audience stays unified with past registrants.
--
-- Two-way fields by design: universities tell us their preferred fair
-- months (so we plan around them); students tell us their target
-- countries / level (so announcements are relevant).
--
-- Purely additive. Idempotent. Apply manually (SQL Editor).
-- RLS on, no public policy → service-role only (server routes).
-- =============================================================

CREATE TABLE IF NOT EXISTS announcement_leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role             TEXT NOT NULL CHECK (role IN ('university', 'student')),
  full_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone_e164       TEXT,
  whatsapp_consent BOOLEAN NOT NULL DEFAULT FALSE,
  email_consent    BOOLEAN NOT NULL DEFAULT TRUE,

  -- University-role fields
  university_name  TEXT,
  country          TEXT,           -- their location (broad list / Other)
  job_title        TEXT,
  preferred_months TEXT[],         -- e.g. {'August','September'}

  -- Student-role fields
  city                TEXT,
  study_level         TEXT,
  preferred_countries TEXT[],      -- target study destinations
  field_of_interest   TEXT,
  intake_year         TEXT,

  -- Meta
  source           TEXT,           -- e.g. 'subscribe_page'
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribed_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcement_leads_email_idx
  ON announcement_leads (lower(email));
CREATE INDEX IF NOT EXISTS announcement_leads_role_idx
  ON announcement_leads (role, is_active);

ALTER TABLE announcement_leads ENABLE ROW LEVEL SECURITY;
