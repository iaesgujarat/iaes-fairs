-- =============================================================
-- IAES Fairs — v17 follow-up: admin-editable expected footfall.
--
-- The landing-page stat card on /, /fair/[id] and the single-fair
-- branch was hardcoded as "1,000+ students". This column lets admin
-- set the displayed value per fair (e.g. "1,000+ students",
-- "500–800 expected", "750+ across all streams"). NULL → UI shows
-- "TBC" so a fresh fair never displays a stale/borrowed number.
--
-- Purely additive. Idempotent. Apply manually (SQL Editor).
-- Safe pre-migration: the UI falls back to "TBC" if the column is
-- absent at read time (helper select is tolerant).
-- =============================================================

ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS expected_footfall TEXT;
