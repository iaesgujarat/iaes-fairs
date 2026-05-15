-- =============================================================
-- IAES Fairs — GST compliance: separate DOMESTIC / EXPORT series
--
-- Replaces the single FY-keyed series from 0012 with two parallel
-- series under one table:
--
--   INR payments (taxable supply)        → DOMESTIC
--                                          IAES-FAIR-2627-001
--   USD payments (zero-rated export)     → EXPORT
--                                          IAES-FAIR-2627-EXP-001
--
-- Both reset on April 1. GST Rule 46 permits multiple series so
-- long as each is sequential within itself — this matches the way
-- a CA reads GSTR-1 (Table 4/7 for domestic, Table 6A for exports).
--
-- Idempotent. The 0012 table is replaced cleanly because no live
-- invoices have been issued yet — 0011's reset ran before any real
-- registration.
-- =============================================================

-- ---------- 1. Drop existing trigger + function ----------------
DROP TRIGGER IF EXISTS trg_invoices_set_number ON invoices;
DROP FUNCTION IF EXISTS generate_invoice_number();
DROP FUNCTION IF EXISTS generate_invoice_number(TEXT);
DROP FUNCTION IF EXISTS set_invoice_number() CASCADE;

-- ---------- 2. Sanity-check the existing sequences table -------
-- If anyone has issued invoices we lose the counter. Warn so it's
-- obvious in the SQL Editor output; pre-launch this should be 0.
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  IF to_regclass('public.invoice_sequences') IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM invoice_sequences;
    IF v_count > 0 THEN
      RAISE WARNING
        'invoice_sequences had % row(s) — they are being dropped. '
        'Verify no live invoice numbers were issued yet.', v_count;
    END IF;
  END IF;
END $$;

DROP TABLE IF EXISTS invoice_sequences CASCADE;

-- ---------- 3. Recreate with composite PK ----------------------
CREATE TABLE invoice_sequences (
  financial_year TEXT NOT NULL,                 -- '2627', '2728', etc.
  series_type    TEXT NOT NULL
    CHECK (series_type IN ('DOMESTIC', 'EXPORT')),
  last_number    INTEGER NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (financial_year, series_type)
);

ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;
-- All access via service role.

-- ---------- 4. Generator: currency-aware, FY-keyed -------------
CREATE OR REPLACE FUNCTION generate_invoice_number(p_currency TEXT)
RETURNS TEXT AS $$
DECLARE
  v_month  INTEGER;
  v_year   INTEGER;
  v_fy     TEXT;
  v_series TEXT;
  v_next   INTEGER;
BEGIN
  v_month := EXTRACT(MONTH FROM NOW());
  v_year  := EXTRACT(YEAR  FROM NOW());

  -- Indian financial year: April → March. Jan/Feb/Mar still belong
  -- to the previous FY.
  IF v_month <= 3 THEN
    v_fy := LPAD((v_year - 1 - 2000)::TEXT, 2, '0') ||
            LPAD((v_year     - 2000)::TEXT, 2, '0');
  ELSE
    v_fy := LPAD((v_year     - 2000)::TEXT, 2, '0') ||
            LPAD((v_year + 1 - 2000)::TEXT, 2, '0');
  END IF;

  -- Series mapping: USD = export (zero-rated); anything else = domestic.
  v_series := CASE WHEN UPPER(p_currency) = 'USD' THEN 'EXPORT'
                   ELSE 'DOMESTIC'
              END;

  INSERT INTO invoice_sequences (financial_year, series_type, last_number)
  VALUES (v_fy, v_series, 1)
  ON CONFLICT (financial_year, series_type)
  DO UPDATE SET
    last_number = invoice_sequences.last_number + 1,
    updated_at  = NOW()
  RETURNING last_number INTO v_next;

  IF v_series = 'EXPORT' THEN
    RETURN 'IAES-FAIR-' || v_fy || '-EXP-' || LPAD(v_next::TEXT, 3, '0');
  ELSE
    RETURN 'IAES-FAIR-' || v_fy || '-' || LPAD(v_next::TEXT, 3, '0');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ---------- 5. Trigger: TAX invoices only, currency from NEW ---
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_type = 'TAX'
     AND (NEW.invoice_number IS NULL OR NEW.invoice_number = '') THEN
    NEW.invoice_number := generate_invoice_number(NEW.payment_currency);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoices_set_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();
