-- =============================================================
-- IAES Fairs — v5 Addendum: T&C Acceptance
--   Adds three columns to `registrations` so every university
--   registration carries an audit trail of which T&C version
--   they accepted and exactly when.
-- =============================================================

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT;
