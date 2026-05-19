-- =============================================================
-- IAES Fairs — v16 Phase 1: multi-fair landing (read side).
--
-- NO schema change. NO new table/column. This migration adds a
-- SINGLE performance index for the new getActiveFairs() query
-- (is_active = true, ordered by fair_date_start).
--
-- Purely additive. Idempotent. PERFORMANCE-ONLY — NOT a hard
-- dependency: every code path works without it (the fairs table
-- is tiny; this just avoids a seq scan). Safe to apply any time,
-- safe to defer. Apply manually (SQL Editor).
-- Prereq: 0001 (fairs), v3-era fair_date_start column.
-- =============================================================

CREATE INDEX IF NOT EXISTS fairs_active_date_idx
  ON fairs (fair_date_start ASC)
  WHERE is_active = true;
