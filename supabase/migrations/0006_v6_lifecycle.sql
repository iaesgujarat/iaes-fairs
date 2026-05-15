-- =============================================================
-- IAES Fairs — v6 (Slice A): Fair Lifecycle
--   * Adds status + lifecycle timestamps to `fairs`
--   * Backfills existing rows: is_active=true -> PUBLISHED,
--     otherwise DRAFT
--   * Creates fair_status_log (immutable audit trail)
--
-- Slices B (admin UI) and C (announcements + reminders) follow.
-- =============================================================

-- ---------- 1. Extend `fairs` -----------------------------------
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN (
      'DRAFT',
      'PUBLISHED',
      'REGISTRATION_CLOSED',
      'ONGOING',
      'COMPLETED',
      'ARCHIVED',
      'CANCELLED'
    )),
  ADD COLUMN IF NOT EXISTS announced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS concluded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS postfair_data_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS itinerary_sent_at TIMESTAMPTZ;

-- Backfill: anything currently active is treated as PUBLISHED.
UPDATE fairs SET status = 'PUBLISHED' WHERE is_active = true  AND status = 'DRAFT';
UPDATE fairs SET status = 'DRAFT'      WHERE is_active = false AND status = 'DRAFT';

-- ---------- 2. Audit trail: fair_status_log ---------------------
CREATE TABLE IF NOT EXISTS fair_status_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fair_status_log_fair_id
  ON fair_status_log(fair_id);
CREATE INDEX IF NOT EXISTS idx_fair_status_log_changed_at
  ON fair_status_log(changed_at);

ALTER TABLE fair_status_log ENABLE ROW LEVEL SECURITY;
-- All writes/reads through service role; no anon policies.
