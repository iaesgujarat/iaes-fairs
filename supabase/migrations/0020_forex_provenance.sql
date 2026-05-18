-- =============================================================
-- IAES Fairs — forex provenance for GST audit trail.
--
-- Stores WHICH rate source + the time-of-day alongside the already-
-- locked forex_rate_used / forex_rate_date, so every INR invoice can
-- state its methodology (CGST Rule 34(2) / GAAP for export of
-- service) on its face and is fully audit-defensible.
--
-- Purely additive. Idempotent. Apply manually (SQL Editor).
-- Prereq: 0002 (invoices.forex_rate_used / forex_rate_date).
-- =============================================================

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS forex_rate_source TEXT;
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS forex_rate_time   TEXT;
