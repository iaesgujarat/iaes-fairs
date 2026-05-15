-- =============================================================
-- IAES Fairs — Catch-up migration (idempotent)
--
-- Re-applies every schema change from 0003 through 0010 in order.
-- Each step is safe to run even if it has already been applied:
-- everything uses IF NOT EXISTS / IF EXISTS / WHERE-guarded UPDATEs.
--
-- PRE-REQUISITE: 0002_v2_schema.sql must already be applied
-- (it created the v2 base tables — fairs / registrations / invoices
-- / payments / billing_details / admin_users plus the invoice number
-- sequences and the seeded August-2026 fair). If `registrations`
-- doesn't exist, paste 0002 first.
--
-- This file does NOT include 0011 (destructive test-data cleanup) —
-- run that separately when ready.
-- =============================================================


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 0003 — v3 addendum (multi-day fair + early-bird + institutions) ║
-- ╚═════════════════════════════════════════════════════════════╝

ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS fair_date_start DATE,
  ADD COLUMN IF NOT EXISTS fair_date_end DATE,
  ADD COLUMN IF NOT EXISTS arrive_by DATE,
  ADD COLUMN IF NOT EXISTS depart_after DATE,
  ADD COLUMN IF NOT EXISTS price_standard_usd NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_standard_inr NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_earlybird_usd NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_earlybird_inr NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS earlybird_deadline DATE,
  ADD COLUMN IF NOT EXISTS includes TEXT[] DEFAULT '{}';

UPDATE fairs SET
  name = 'IAES U.S. University Education Fair — August 2026',
  city = 'Ahmedabad',
  venue = 'Ahmedabad (venue TBC)',
  fair_date = '2026-08-06',
  fair_date_start = '2026-08-06',
  fair_date_end = '2026-08-08',
  arrive_by = '2026-08-05',
  depart_after = '2026-08-09',
  registration_deadline = '2026-07-05',
  booth_price_usd = 1700.00,
  price_standard_usd = 1700.00,
  price_standard_inr = 161500.00,
  price_earlybird_usd = 1500.00,
  price_earlybird_inr = 142500.00,
  earlybird_deadline = '2026-06-15',
  includes = ARRAY[
    'Travel to institute visits by cabs arranged by IAES',
    'Logistics and lunch during all days'
  ]
WHERE name IN (
  'EducationUSA India Fair 2025',
  'IAES U.S. University Education Fair — August 2026'
);

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS pricing_tier TEXT NOT NULL DEFAULT 'STANDARD'
    CHECK (pricing_tier IN ('STANDARD', 'EARLYBIRD'));

CREATE TABLE IF NOT EXISTS institution_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) NOT NULL,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL
    CHECK (institution_type IN (
      'School', 'Junior College', 'Degree College',
      'University', 'Coaching Institute', 'Other'
    )),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  website TEXT,
  contact_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  expected_student_count INTEGER NOT NULL CHECK (expected_student_count >= 1),
  courses TEXT[] NOT NULL DEFAULT '{}',
  year_semester TEXT[] NOT NULL DEFAULT '{}',
  fields_of_interest TEXT[] NOT NULL DEFAULT '{}',
  budget_range TEXT,
  whatsapp_consent BOOLEAN DEFAULT false,
  email_consent BOOLEAN DEFAULT true,
  data_sharing_consent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'registered'
    CHECK (status IN ('registered', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inst_reg_fair_id ON institution_registrations(fair_id);
CREATE INDEX IF NOT EXISTS idx_inst_reg_email ON institution_registrations(email);
CREATE INDEX IF NOT EXISTS idx_inst_reg_status ON institution_registrations(status);

ALTER TABLE institution_registrations ENABLE ROW LEVEL SECURITY;


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 0004 — v5 T&C acceptance columns on registrations             ║
-- ╚═════════════════════════════════════════════════════════════╝

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT;


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 0005 — v4 student passes + scanner                            ║
-- ╚═════════════════════════════════════════════════════════════╝

CREATE SEQUENCE IF NOT EXISTS pass_counter START 1;

CREATE OR REPLACE FUNCTION set_pass_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pass_number IS NULL OR NEW.pass_number = '' THEN
    NEW.pass_number := 'FAIR-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                       LPAD(nextval('pass_counter')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS fair_student_passes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pass_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  fair_id UUID REFERENCES fairs(id) NOT NULL,
  institution_registration_id UUID
    REFERENCES institution_registrations(id)
    ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  current_course TEXT,
  current_semester TEXT,
  english_exam TEXT,
  field_of_interest TEXT[] NOT NULL DEFAULT '{}',
  budget_range TEXT,
  preferred_countries TEXT[] NOT NULL DEFAULT '{}',
  whatsapp_consent BOOLEAN NOT NULL DEFAULT false,
  email_consent BOOLEAN NOT NULL DEFAULT true,
  data_sharing_consent BOOLEAN NOT NULL DEFAULT false,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  pass_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email, fair_id)
);

CREATE INDEX IF NOT EXISTS idx_passes_fair_id ON fair_student_passes(fair_id);
CREATE INDEX IF NOT EXISTS idx_passes_email ON fair_student_passes(email);
CREATE INDEX IF NOT EXISTS idx_passes_pass_number ON fair_student_passes(pass_number);

DROP TRIGGER IF EXISTS trg_set_pass_number ON fair_student_passes;
CREATE TRIGGER trg_set_pass_number
  BEFORE INSERT ON fair_student_passes
  FOR EACH ROW EXECUTE FUNCTION set_pass_number();

CREATE TABLE IF NOT EXISTS fair_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pass_uuid UUID REFERENCES fair_student_passes(pass_uuid) ON DELETE CASCADE NOT NULL,
  fair_id UUID REFERENCES fairs(id) NOT NULL,
  university_registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE NOT NULL,
  rep_notes TEXT,
  interested BOOLEAN NOT NULL DEFAULT false,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pass_uuid, university_registration_id)
);

CREATE INDEX IF NOT EXISTS idx_scans_fair_id ON fair_scans(fair_id);
CREATE INDEX IF NOT EXISTS idx_scans_university ON fair_scans(university_registration_id);
CREATE INDEX IF NOT EXISTS idx_scans_pass_uuid ON fair_scans(pass_uuid);

ALTER TABLE fair_student_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fair_scans ENABLE ROW LEVEL SECURITY;


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 0006 — v6 fair lifecycle (status + audit log)                 ║
-- ╚═════════════════════════════════════════════════════════════╝

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

UPDATE fairs SET status = 'PUBLISHED' WHERE is_active = true  AND status = 'DRAFT';
UPDATE fairs SET status = 'DRAFT'      WHERE is_active = false AND status = 'DRAFT';

CREATE TABLE IF NOT EXISTS fair_status_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fair_status_log_fair_id  ON fair_status_log(fair_id);
CREATE INDEX IF NOT EXISTS idx_fair_status_log_changed_at ON fair_status_log(changed_at);

ALTER TABLE fair_status_log ENABLE ROW LEVEL SECURITY;


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 0007 — v6 announcements (mailing list + send log)             ║
-- ╚═════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS announcement_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  organization TEXT,
  source TEXT NOT NULL DEFAULT 'MANUAL'
    CHECK (source IN ('PAST_PARTICIPANT', 'MANUAL', 'CSV_UPLOAD', 'NEWSLETTER')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_announcement_recipients_active
  ON announcement_recipients(is_active);
CREATE INDEX IF NOT EXISTS idx_announcement_recipients_source
  ON announcement_recipients(source);

ALTER TABLE announcement_recipients ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS announcement_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES announcement_recipients(id) ON DELETE CASCADE NOT NULL,
  email_type TEXT NOT NULL
    CHECK (email_type IN (
      'ANNOUNCEMENT',
      'EARLYBIRD_REMINDER',
      'REGISTRATION_REMINDER',
      'ITINERARY',
      'PAYMENT_REMINDER',
      'POSTFAIR_DATA',
      'CANCELLATION'
    )),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  resend_email_id TEXT,
  UNIQUE(fair_id, recipient_id, email_type)
);

CREATE INDEX IF NOT EXISTS idx_announcement_sends_fair
  ON announcement_sends(fair_id);
CREATE INDEX IF NOT EXISTS idx_announcement_sends_recipient
  ON announcement_sends(recipient_id);

ALTER TABLE announcement_sends ENABLE ROW LEVEL SECURITY;


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 0008 — v7 booth configuration (extra tables + extra reps)     ║
-- ╚═════════════════════════════════════════════════════════════╝

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS total_tables INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_reps INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS addon_tables INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS addon_reps INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS addon_cost_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00;

UPDATE registrations
SET total_reps = LEAST(GREATEST(number_of_reps, 1), 6)
WHERE total_reps = 2 AND number_of_reps IS NOT NULL;

ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS price_extra_table_usd NUMERIC(10,2) NOT NULL DEFAULT 300.00,
  ADD COLUMN IF NOT EXISTS price_extra_rep_usd NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS max_tables_per_university INTEGER NOT NULL DEFAULT 3;

UPDATE fairs SET
  price_extra_table_usd = 300.00,
  price_extra_rep_usd   = 100.00,
  max_tables_per_university = 3
WHERE price_extra_table_usd IS NULL
   OR price_extra_rep_usd   IS NULL
   OR max_tables_per_university IS NULL;


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 0009 — RLS fix on fairs (post-v6 visibility for anon)         ║
-- ╚═════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "fairs: anon read active" ON fairs;
DROP POLICY IF EXISTS "fairs: anon read public" ON fairs;

CREATE POLICY "fairs: anon read public" ON fairs
  FOR SELECT
  TO anon, authenticated
  USING (
    status IN (
      'PUBLISHED',
      'REGISTRATION_CLOSED',
      'ONGOING',
      'COMPLETED',
      'CANCELLED'
    )
  );


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 0010 — v8 deferred payment gateway + proforma invoices         ║
-- ╚═════════════════════════════════════════════════════════════╝

ALTER TABLE fairs
  ADD COLUMN IF NOT EXISTS payment_gateway_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gateway_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gateway_activation_note TEXT;

UPDATE fairs
SET payment_gateway_active = false
WHERE name = 'IAES U.S. University Education Fair — August 2026'
  AND payment_gateway_active IS NOT TRUE;

ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_status_check
  CHECK (status IN (
    'registered',
    'payment_open',
    'pending',
    'invoice_sent',
    'paid',
    'confirmed',
    'cancelled'
  ));

ALTER TABLE registrations
  ALTER COLUMN status SET DEFAULT 'registered';

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'TAX'
    CHECK (invoice_type IN ('PROFORMA', 'TAX')),
  ADD COLUMN IF NOT EXISTS proforma_reference TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_proforma_reference
  ON invoices(proforma_reference)
  WHERE proforma_reference IS NOT NULL;

ALTER TABLE invoices
  ALTER COLUMN invoice_number DROP NOT NULL;
