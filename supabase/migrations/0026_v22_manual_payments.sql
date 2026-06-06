-- =============================================================
-- IAES Fairs — v22 (2A): soft-confirm status + manual-payment capture.
--
-- Two additions, both for the offline-payment era (and they keep
-- working once Razorpay is live):
--
--   1. registrations.status gains 'soft_confirmed' — an admin-
--      acknowledged HOLD (spot reserved, payment still pending),
--      distinct from a real, paid 'confirmed'. Does NOT lock billing
--      (the v22 Phase-1 lock keys off a paid TAX invoice, not status).
--
--   2. payments gains MANUAL-reconciliation fields. When an admin
--      records an offline payment ("Mark as paid"), we capture what
--      actually hit the bank so books + the post-fair Finance MIS tie
--      out. The existing amount_paid/currency hold the INVOICE (billed)
--      amount; amount_credited_inr holds the ACTUAL bank realisation
--      (which differs by forex / bank / gateway charges).
--
-- Purely additive. Idempotent. Apply manually (SQL Editor).
-- =============================================================

-- ---- 1. Allow the new soft_confirmed status -----------------
ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_status_check
  CHECK (status IN (
    'registered',      -- gateway off, awaiting activation
    'payment_open',    -- gateway on, payment link sent
    'soft_confirmed',  -- v22: admin-acknowledged hold, payment pending
    'pending',         -- legacy
    'invoice_sent',    -- legacy
    'paid',
    'confirmed',       -- hard confirm: payment received
    'cancelled'
  ));

-- ---- 2. Manual-payment / reconciliation fields --------------
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS entry_mode TEXT NOT NULL DEFAULT 'gateway'
    CHECK (entry_mode IN ('gateway', 'manual')),
  ADD COLUMN IF NOT EXISTS bank_credit_date    DATE,
  ADD COLUMN IF NOT EXISTS reference_number    TEXT,
  ADD COLUMN IF NOT EXISTS amount_credited_inr NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS remitter_name       TEXT,
  ADD COLUMN IF NOT EXISTS notes               TEXT,
  ADD COLUMN IF NOT EXISTS recorded_by         TEXT;

CREATE INDEX IF NOT EXISTS payments_entry_mode_idx
  ON payments (entry_mode);
CREATE INDEX IF NOT EXISTS payments_bank_credit_date_idx
  ON payments (bank_credit_date);
