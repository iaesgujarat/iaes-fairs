-- =============================================================
-- IAES Fairs — v13: Auto-conclude + stats caching + thank-you.
-- A Netlify scheduled function concludes ONGOING fairs the night
-- after they end (midnight IST), caches stats and fires thank-you
-- emails. Manual "Conclude" stays as an emergency override.
--
-- Purely additive. Idempotent. Apply manually (SQL Editor).
-- Prereq: 0001 (fairs) already applied.
-- =============================================================

-- Auto-conclude tracking
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS auto_concluded BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS thankyou_emails_sent_at TIMESTAMPTZ;

-- Cached post-fair stats (computed once at conclusion). v12's
-- between-fairs page reads stat_universities_participated /
-- stat_students_attended; the others power the admin summary.
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS stat_universities_participated INTEGER;
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS stat_students_attended INTEGER;
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS stat_booth_scans INTEGER;
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS stat_cities_visited INTEGER;
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS stat_cached_at TIMESTAMPTZ;
