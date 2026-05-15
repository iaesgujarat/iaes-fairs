-- =============================================================
-- IAES Fairs — v8: Deferred Payment Gateway + Proforma Invoice
--
--   * Adds payment_gateway_active toggle on fairs
--   * Expands registrations.status to include 'registered'
--     and 'payment_open' (default flips to 'registered')
--   * Adds invoice_type ('PROFORMA' | 'TAX') and an opaque
--     proforma_reference column on invoices
--
-- This is purely additive — no data is destroyed. The companion
-- file 0011_reset_test_data.sql wipes the pre-launch test rows
-- and resets the invoice counters; run it AFTER this migration.
-- =============================================================

-- ---------- 1. Extend `fairs` (gateway toggle) ------------------
ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS payment_gateway_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gateway_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gateway_activation_note TEXT;

-- Make sure the seeded fair starts with the gateway OFF.
UPDATE fairs
SET payment_gateway_active = false
WHERE name = 'IAES U.S. University Education Fair — August 2026'
  AND payment_gateway_active IS NOT TRUE;

-- ---------- 2. Expand `registrations.status` -------------------
ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_status_check
  CHECK (status IN (
    'registered',     -- new: registered, gateway off
    'payment_open',   -- new: registered, gateway flipped on
    'pending',        -- legacy
    'invoice_sent',   -- legacy
    'paid',
    'confirmed',
    'cancelled'
  ));

ALTER TABLE registrations
  ALTER COLUMN status SET DEFAULT 'registered';

-- ---------- 3. Extend `invoices` (proforma vs tax) -------------
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'TAX'
    CHECK (invoice_type IN ('PROFORMA', 'TAX')),
  ADD COLUMN IF NOT EXISTS proforma_reference TEXT;

-- Unique index lets multiple TAX invoices have NULL proforma_reference
-- but enforces uniqueness on whatever PI-YYYY-XXXX values we issue.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_proforma_reference
  ON invoices(proforma_reference)
  WHERE proforma_reference IS NOT NULL;

-- Make invoice_number nullable: proformas never consume the
-- per-currency sequence.
ALTER TABLE invoices
  ALTER COLUMN invoice_number DROP NOT NULL;
