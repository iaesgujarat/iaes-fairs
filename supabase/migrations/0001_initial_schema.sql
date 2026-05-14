-- =============================================================
-- IAES Fairs — Initial Schema Migration
-- Run this in the Supabase SQL Editor (Project > SQL > New Query)
-- or via `supabase db push` if using the CLI.
-- =============================================================

-- ----------- Table: fairs -------------------------------------
CREATE TABLE IF NOT EXISTS fairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Ahmedabad',
  venue TEXT,
  fair_date DATE NOT NULL,
  registration_deadline DATE,
  booth_price_usd NUMERIC(10,2) NOT NULL,
  booth_price_inr NUMERIC(10,2) NOT NULL,
  max_universities INTEGER DEFAULT 30,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed one fair so the landing page has content immediately
INSERT INTO fairs (name, city, venue, fair_date, registration_deadline, booth_price_usd, booth_price_inr, description)
SELECT
  'EducationUSA India Fair 2025',
  'Ahmedabad',
  'Hotel Courtyard by Marriott, Ahmedabad',
  '2025-11-15',
  '2025-10-31',
  500.00,
  41500.00,
  'Annual flagship fair connecting American universities with top Gujarati students. Expected 1000+ student attendees.'
WHERE NOT EXISTS (SELECT 1 FROM fairs);

-- ----------- Table: registrations -----------------------------
CREATE TABLE IF NOT EXISTS registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) NOT NULL,

  university_name TEXT NOT NULL,
  university_country TEXT DEFAULT 'USA',
  university_website TEXT,

  contact_name TEXT NOT NULL,
  contact_title TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  booth_type TEXT DEFAULT 'Standard',
  number_of_reps INTEGER DEFAULT 1,

  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'invoice_sent', 'paid', 'confirmed', 'cancelled')),

  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_fair_id ON registrations(fair_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(contact_email);

-- ----------- Invoice number sequence + generator --------------
CREATE SEQUENCE IF NOT EXISTS invoice_counter START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'IAES-FAIR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_counter')::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ----------- Table: invoices ----------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id) NOT NULL,

  invoice_number TEXT UNIQUE NOT NULL DEFAULT generate_invoice_number(),
  amount_inr NUMERIC(10,2) NOT NULL,
  amount_usd NUMERIC(10,2),
  gst_percent NUMERIC(5,2) DEFAULT 18.00,
  gst_amount_inr NUMERIC(10,2),
  total_amount_inr NUMERIC(10,2) NOT NULL,

  currency TEXT DEFAULT 'INR',
  due_date DATE,
  pdf_url TEXT,

  status TEXT DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'paid', 'cancelled')),

  issued_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_registration_id ON invoices(registration_id);

-- ----------- Table: payments ----------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  registration_id UUID REFERENCES registrations(id) NOT NULL,

  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,

  amount_paid_inr NUMERIC(10,2) NOT NULL,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'initiated'
    CHECK (payment_status IN ('initiated', 'success', 'failed', 'refunded')),

  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_registration_id ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(razorpay_order_id);

-- ----------- Table: admin_users -------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
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

-- ----------- updated_at trigger for registrations -------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_registrations_updated_at ON registrations;
CREATE TRIGGER trg_registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------- Row Level Security -------------------------------
ALTER TABLE fairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous) may read active fairs (for the public landing page).
DROP POLICY IF EXISTS "fairs: anon read active" ON fairs;
CREATE POLICY "fairs: anon read active" ON fairs
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Server-side service role bypasses RLS automatically — used by /api routes.
-- We intentionally do NOT add anon insert/select policies for registrations/invoices/payments;
-- all writes go through service-role API routes. Admin reads also go through service role.

-- Admins can self-read their row (so middleware can confirm "is this user an admin?").
DROP POLICY IF EXISTS "admin_users: self read" ON admin_users;
CREATE POLICY "admin_users: self read" ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ----------- Storage bucket for invoice PDFs ------------------
-- Optional: uncomment if you want to store generated PDFs in Supabase storage.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false)
-- ON CONFLICT (id) DO NOTHING;
