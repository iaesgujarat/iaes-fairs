-- =============================================================
-- IAES Fairs — v2 Schema Migration (Dual Currency + Full GST)
--
-- This is a CLEAN-BREAK migration. It drops every table created in
-- 0001 and recreates the schema to match the v2 spec
-- (IAES_FAIRS_CLAUDECODE_PROMPT_v2.md). Only safe to run because
-- production has no real registrations yet — only seed data.
--
-- Run in: Supabase > SQL Editor > New Query > paste > Run.
-- Idempotent: re-running drops and recreates everything cleanly.
-- =============================================================

-- ---------- Drop everything from 0001 -------------------------
-- Tables first: dropping them clears all references to the
-- generate_invoice_number() default and the updated_at trigger.
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS billing_details CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS fairs CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS set_invoice_number() CASCADE;
DROP FUNCTION IF EXISTS generate_invoice_number() CASCADE;
DROP FUNCTION IF EXISTS generate_invoice_number(TEXT) CASCADE;
DROP SEQUENCE IF EXISTS invoice_counter CASCADE;
DROP SEQUENCE IF EXISTS invoice_counter_inr CASCADE;
DROP SEQUENCE IF EXISTS invoice_counter_usd CASCADE;

-- ---------- Table: fairs --------------------------------------
CREATE TABLE fairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Ahmedabad',
  venue TEXT,
  fair_date DATE NOT NULL,
  registration_deadline DATE,
  booth_price_usd NUMERIC(10,2) NOT NULL,
  max_universities INTEGER DEFAULT 30,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO fairs (name, city, venue, fair_date, registration_deadline, booth_price_usd, description)
VALUES (
  'EducationUSA India Fair 2025',
  'Ahmedabad',
  'Hotel Courtyard by Marriott, Ahmedabad',
  '2025-11-15',
  '2025-10-31',
  500.00,
  'Annual flagship fair connecting American universities with top Gujarati students. Expected 1000+ student attendees.'
);

-- ---------- Table: registrations ------------------------------
CREATE TABLE registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) NOT NULL,

  -- University Details
  university_name TEXT NOT NULL,
  university_country TEXT DEFAULT 'USA',
  university_website TEXT,

  -- Contact Person
  contact_name TEXT NOT NULL,
  contact_title TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  -- Booth
  booth_type TEXT DEFAULT 'Standard',
  number_of_reps INTEGER DEFAULT 1,

  -- Payment Preference (drives GST + Razorpay currency)
  payment_currency TEXT NOT NULL DEFAULT 'USD'
    CHECK (payment_currency IN ('USD', 'INR')),

  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'invoice_sent', 'paid', 'confirmed', 'cancelled')),

  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registrations_fair_id ON registrations(fair_id);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_email ON registrations(contact_email);

-- ---------- Table: billing_details ----------------------------
-- Required for INR (GST-applicable) registrations.
CREATE TABLE billing_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE UNIQUE NOT NULL,

  legal_name TEXT NOT NULL,
  billing_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,           -- determines CGST+SGST vs IGST
  pin_code TEXT NOT NULL,
  pan_number TEXT NOT NULL,

  is_gst_registered BOOLEAN DEFAULT false,
  gstin TEXT,                    -- 15-char, required when is_gst_registered = true

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_details_registration_id ON billing_details(registration_id);

-- ---------- Invoice number sequences + generator --------------
-- INR and USD invoices are issued on independent series so the
-- numbering is meaningful for accounting:
--   INR -> IAES-FAIR-INR-2025-001
--   USD -> IAES-FAIR-USD-2025-001
CREATE SEQUENCE invoice_counter_inr START 1;
CREATE SEQUENCE invoice_counter_usd START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number(p_currency TEXT)
RETURNS TEXT AS $$
BEGIN
  IF p_currency = 'INR' THEN
    RETURN 'IAES-FAIR-INR-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
           LPAD(nextval('invoice_counter_inr')::TEXT, 3, '0');
  ELSE
    RETURN 'IAES-FAIR-USD-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
           LPAD(nextval('invoice_counter_usd')::TEXT, 3, '0');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ---------- Table: invoices -----------------------------------
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE NOT NULL,

  invoice_number TEXT UNIQUE NOT NULL,

  -- Currency & forex (rate locked at invoice creation time)
  payment_currency TEXT NOT NULL CHECK (payment_currency IN ('USD', 'INR')),
  forex_rate_used NUMERIC(10,4),   -- e.g. 83.5200
  forex_rate_date DATE,

  -- Amounts (USD is source of truth; INR derived for INR invoices)
  base_amount_usd NUMERIC(10,2) NOT NULL,
  base_amount_inr NUMERIC(10,2),

  -- GST (only applicable on INR invoices)
  gst_type TEXT NOT NULL DEFAULT 'NONE'
    CHECK (gst_type IN ('NONE', 'IGST', 'CGST_SGST')),

  cgst_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  sgst_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,

  igst_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  igst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Totals (one of these is the payable amount, depending on payment_currency)
  total_amount_usd NUMERIC(10,2),
  total_amount_inr NUMERIC(10,2),

  due_date DATE,
  pdf_url TEXT,
  status TEXT DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'paid', 'cancelled')),

  issued_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_registration_id ON invoices(registration_id);

-- ---------- Table: payments -----------------------------------
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE NOT NULL,

  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,

  amount_paid NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('INR', 'USD')),

  payment_method TEXT,
  payment_status TEXT DEFAULT 'initiated'
    CHECK (payment_status IN ('initiated', 'success', 'failed', 'refunded')),

  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_registration_id ON payments(registration_id);
CREATE INDEX idx_payments_order_id ON payments(razorpay_order_id);

-- ---------- Table: admin_users --------------------------------
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO admin_users (email, name)
VALUES
  ('eduadviser@iaesgujarat.org', 'IAES Admin'),
  ('jaydeep@iaesgujarat.org', 'Jaydeep / IAES')
ON CONFLICT (email) DO NOTHING;

-- ---------- updated_at trigger for registrations --------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- BEFORE INSERT trigger: assign invoice_number ------
-- Branches on NEW.payment_currency so each currency draws from
-- its own sequence. The API doesn't pass invoice_number; if it
-- ever does, that value is respected.
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number(NEW.payment_currency);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoices_set_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

-- ---------- Row Level Security --------------------------------
ALTER TABLE fairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous) may read active fairs (for the public landing page).
CREATE POLICY "fairs: anon read active" ON fairs
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Server-side service role bypasses RLS automatically — used by /api routes.
-- We intentionally do NOT add anon insert/select policies for
-- registrations/billing_details/invoices/payments; all writes go through
-- service-role API routes. Admin reads also go through service role.

-- Admins can self-read their row (so middleware can confirm "is this user an admin?").
CREATE POLICY "admin_users: self read" ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
