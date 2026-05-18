-- =============================================================
-- IAES Fairs — v14: Premium Booth tier + global add-on table pool.
--
-- Premium = fixed package (2 tables, 4 reps, flat USD 2,500), N
-- slots/fair, deadline = early-bird deadline. Standard/Early-Bird
-- may add 1 extra table from a SHARED per-fair pool (premium tables
-- are NOT from this pool). Server is the source of truth.
--
-- Purely additive. Idempotent. Apply manually (SQL Editor).
-- Prereq: 0001 (fairs/registrations), 0008 (v7 booth cols).
-- ALSO (manual, Phase B): Storage → create private bucket
--   `fair-assets`  (admin uploads premium logos; signed URLs).
-- =============================================================

-- ---------- 1. fairs: premium + pool columns ------------------
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS price_premium_usd      NUMERIC(10,2) DEFAULT 2500.00;
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS price_premium_inr      NUMERIC(10,2);
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS premium_slots_total    INTEGER NOT NULL DEFAULT 4;
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS premium_deadline       DATE;
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS addon_tables_pool      INTEGER NOT NULL DEFAULT 6;
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS max_addon_tables_per_reg INTEGER NOT NULL DEFAULT 1;

-- max_tables_per_university already exists from v7 (default 3).
-- v14 lowers the default to 2 (1 base + max 1 add-on for non-premium).
-- Existing rows are NOT bulk-changed; only the Aug 2026 seed below.
ALTER TABLE fairs
  ALTER COLUMN max_tables_per_university SET DEFAULT 2;

-- ---------- 2. registrations: tier + premium fields -----------
ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_pricing_tier_check;
ALTER TABLE registrations
  ADD CONSTRAINT registrations_pricing_tier_check
  CHECK (pricing_tier IN ('STANDARD', 'EARLYBIRD', 'PREMIUM'));

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS backdrop_png_url      TEXT;
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS backdrop_received     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS backdrop_received_at  TIMESTAMPTZ;
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS logo_reminder_sent_at TIMESTAMPTZ;

-- ---------- 3. Premium slot status view -----------------------
CREATE OR REPLACE VIEW premium_slot_status AS
SELECT
  f.id AS fair_id,
  f.premium_slots_total,
  COUNT(r.id) FILTER (
    WHERE r.pricing_tier = 'PREMIUM' AND r.status <> 'cancelled'
  ) AS slots_taken,
  f.premium_slots_total - COUNT(r.id) FILTER (
    WHERE r.pricing_tier = 'PREMIUM' AND r.status <> 'cancelled'
  ) AS slots_remaining
FROM fairs f
LEFT JOIN registrations r ON r.fair_id = f.id
GROUP BY f.id, f.premium_slots_total;

-- ---------- 4. Add-on table pool status view ------------------
-- Premium registrations are excluded — their tables come from the
-- premium allocation, not this shared pool.
CREATE OR REPLACE VIEW addon_table_status AS
SELECT
  f.id AS fair_id,
  f.addon_tables_pool,
  COALESCE(SUM(r.addon_tables) FILTER (
    WHERE r.status <> 'cancelled' AND r.pricing_tier <> 'PREMIUM'
  ), 0) AS tables_taken,
  f.addon_tables_pool - COALESCE(SUM(r.addon_tables) FILTER (
    WHERE r.status <> 'cancelled' AND r.pricing_tier <> 'PREMIUM'
  ), 0) AS tables_remaining
FROM fairs f
LEFT JOIN registrations r ON r.fair_id = f.id
GROUP BY f.id, f.addon_tables_pool;

-- ---------- 5. Table summary view (admin panel) ---------------
CREATE OR REPLACE VIEW fair_table_summary AS
SELECT
  f.id AS fair_id,
  f.name AS fair_name,
  COUNT(r.id) FILTER (
    WHERE r.pricing_tier = 'PREMIUM' AND r.status <> 'cancelled'
  ) * 2 AS premium_tables_in_use,
  COUNT(r.id) FILTER (
    WHERE r.pricing_tier <> 'PREMIUM' AND r.status <> 'cancelled'
  ) AS standard_base_tables,
  COALESCE(SUM(r.addon_tables) FILTER (
    WHERE r.pricing_tier <> 'PREMIUM' AND r.status <> 'cancelled'
  ), 0) AS addon_tables_taken,
  f.addon_tables_pool,
  COUNT(r.id) FILTER (
    WHERE r.pricing_tier = 'PREMIUM' AND r.status <> 'cancelled'
  ) * 2
  + COUNT(r.id) FILTER (
    WHERE r.pricing_tier <> 'PREMIUM' AND r.status <> 'cancelled'
  )
  + COALESCE(SUM(r.addon_tables) FILTER (
    WHERE r.pricing_tier <> 'PREMIUM' AND r.status <> 'cancelled'
  ), 0) AS total_tables_in_use
FROM fairs f
LEFT JOIN registrations r ON r.fair_id = f.id
GROUP BY f.id, f.name, f.addon_tables_pool;

-- ---------- 6. Seed: August 2026 fair -------------------------
UPDATE fairs SET
  price_premium_usd         = 2500.00,
  price_premium_inr         = 237500.00,
  premium_slots_total       = 4,
  premium_deadline          = '2026-06-15',
  addon_tables_pool         = 6,
  max_addon_tables_per_reg  = 1,
  max_tables_per_university = 2
WHERE name LIKE '%August 2026%';
