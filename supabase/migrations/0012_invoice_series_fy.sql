-- =============================================================
-- IAES Fairs — GST compliance: single FY-keyed invoice series
--
-- Replaces the per-currency sequences from 0002 (and the legacy
-- single sequence from 0001) with a single, financial-year-keyed
-- table-based counter:
--
--   IAES-FAIR-2627-001  (April 2026 → March 2027)
--   IAES-FAIR-2728-001  (April 2027 → March 2028)
--
-- One unified series. Resets every April 1. Currency is stored on
-- the invoice row in payment_currency — it is NOT part of the
-- invoice number anymore.
--
-- The BEFORE INSERT trigger is tightened to only consume a number
-- for invoice_type='TAX'. Proformas keep invoice_number NULL.
--
-- Idempotent.
-- =============================================================

-- ---------- 1. Drop trigger + old generator signatures ---------
-- The trigger has to go first because it depends on the function.
DROP TRIGGER IF EXISTS trg_invoices_set_number ON invoices;

-- Drop every prior version of the generator. Postgres differentiates
-- on argument list, so all three need explicit drops.
DROP FUNCTION IF EXISTS generate_invoice_number();
DROP FUNCTION IF EXISTS generate_invoice_number(TEXT);
DROP FUNCTION IF EXISTS set_invoice_number() CASCADE;

-- ---------- 2. Retire the old sequences ------------------------
DROP SEQUENCE IF EXISTS invoice_counter;
DROP SEQUENCE IF EXISTS invoice_counter_inr;
DROP SEQUENCE IF EXISTS invoice_counter_usd;

-- ---------- 3. New table-backed counter ------------------------
CREATE TABLE IF NOT EXISTS invoice_sequences (
  financial_year TEXT PRIMARY KEY,   -- '2627', '2728', etc.
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;
-- All access via service role (no anon policy on purpose).

-- ---------- 4. New generator: FY-aware, no currency ------------
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_month INTEGER;
  v_year  INTEGER;
  v_fy    TEXT;
  v_next  INTEGER;
BEGIN
  v_month := EXTRACT(MONTH FROM NOW());
  v_year  := EXTRACT(YEAR  FROM NOW());

  -- Indian financial year: April → March. Jan/Feb/Mar still belong
  -- to the previous FY.
  IF v_month <= 3 THEN
    v_fy := LPAD((v_year - 1 - 2000)::TEXT, 2, '0') ||
            LPAD((v_year - 2000)::TEXT, 2, '0');
  ELSE
    v_fy := LPAD((v_year - 2000)::TEXT, 2, '0') ||
            LPAD((v_year - 2000 + 1)::TEXT, 2, '0');
  END IF;

  -- Atomically allocate the next number for this FY.
  INSERT INTO invoice_sequences (financial_year, last_number)
  VALUES (v_fy, 1)
  ON CONFLICT (financial_year)
  DO UPDATE SET
    last_number = invoice_sequences.last_number + 1,
    updated_at  = NOW()
  RETURNING last_number INTO v_next;

  RETURN 'IAES-FAIR-' || v_fy || '-' || LPAD(v_next::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ---------- 5. Trigger: only assign a number on TAX invoices ----
-- Proformas explicitly stay at invoice_number = NULL.
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_type = 'TAX'
     AND (NEW.invoice_number IS NULL OR NEW.invoice_number = '') THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoices_set_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();
