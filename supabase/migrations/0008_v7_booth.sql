-- =============================================================
-- IAES Fairs — v7: Booth Configuration (Tables + Reps)
--   * Adds booth-size columns to `registrations`
--   * Adds add-on pricing + max-tables to `fairs`
--   * Seeds the current fair with USD 300 / table, USD 100 / rep,
--     and a 3-table hard limit per university
-- =============================================================

-- ---------- 1. Extend `registrations` ---------------------------
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS total_tables INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_reps INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS addon_tables INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS addon_reps INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS addon_cost_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- Backfill: existing `number_of_reps` becomes `total_reps` when sensible
UPDATE registrations
SET total_reps = LEAST(GREATEST(number_of_reps, 1), 6)
WHERE total_reps = 2 AND number_of_reps IS NOT NULL;

-- ---------- 2. Extend `fairs` -----------------------------------
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS price_extra_table_usd NUMERIC(10,2) NOT NULL DEFAULT 300.00,
  ADD COLUMN IF NOT EXISTS price_extra_rep_usd NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS max_tables_per_university INTEGER NOT NULL DEFAULT 3;

-- Re-affirm the values on existing fair rows (the column DEFAULTs cover
-- new rows; this ensures pre-existing rows have the same numbers).
UPDATE fairs SET
  price_extra_table_usd = 300.00,
  price_extra_rep_usd   = 100.00,
  max_tables_per_university = 3
WHERE price_extra_table_usd IS NULL
   OR price_extra_rep_usd   IS NULL
   OR max_tables_per_university IS NULL;
