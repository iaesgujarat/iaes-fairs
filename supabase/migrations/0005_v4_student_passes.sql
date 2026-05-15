-- =============================================================
-- IAES Fairs — v4 Addendum: Student Pass + Scanner
--   * fair_student_passes — each pass has a UUID (in QR) + a
--     human-readable pass_number like FAIR-2026-0042
--   * fair_scans — record of which university scanned which
--     student; uniqueness prevents duplicate rows
-- =============================================================

-- ---------- pass_number sequence + trigger ---------------------
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

-- ---------- Table: fair_student_passes -------------------------
CREATE TABLE IF NOT EXISTS fair_student_passes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pass_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),  -- encoded in QR
  fair_id UUID REFERENCES fairs(id) NOT NULL,

  -- Optional link back to an institution registration (null if student self-registered)
  institution_registration_id UUID
    REFERENCES institution_registrations(id)
    ON DELETE SET NULL,

  -- Student identity
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Academic profile
  institution_name TEXT NOT NULL,
  current_course TEXT,
  current_semester TEXT,
  english_exam TEXT,

  -- Interest profile
  field_of_interest TEXT[] NOT NULL DEFAULT '{}',
  budget_range TEXT,
  preferred_countries TEXT[] NOT NULL DEFAULT '{}',

  -- Consents
  whatsapp_consent BOOLEAN NOT NULL DEFAULT false,
  email_consent BOOLEAN NOT NULL DEFAULT true,
  data_sharing_consent BOOLEAN NOT NULL DEFAULT false,

  -- Fair day
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,

  -- Display
  pass_number TEXT UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One pass per email per fair
  UNIQUE (email, fair_id)
);

CREATE INDEX IF NOT EXISTS idx_passes_fair_id ON fair_student_passes(fair_id);
CREATE INDEX IF NOT EXISTS idx_passes_email ON fair_student_passes(email);
CREATE INDEX IF NOT EXISTS idx_passes_pass_number ON fair_student_passes(pass_number);

DROP TRIGGER IF EXISTS trg_set_pass_number ON fair_student_passes;
CREATE TRIGGER trg_set_pass_number
  BEFORE INSERT ON fair_student_passes
  FOR EACH ROW EXECUTE FUNCTION set_pass_number();

-- ---------- Table: fair_scans ----------------------------------
CREATE TABLE IF NOT EXISTS fair_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pass_uuid UUID REFERENCES fair_student_passes(pass_uuid) ON DELETE CASCADE NOT NULL,
  fair_id UUID REFERENCES fairs(id) NOT NULL,
  university_registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE NOT NULL,

  rep_notes TEXT,
  interested BOOLEAN NOT NULL DEFAULT false,

  scanned_at TIMESTAMPTZ DEFAULT NOW(),

  -- One scan per (pass, university) — re-scans update notes only
  UNIQUE (pass_uuid, university_registration_id)
);

CREATE INDEX IF NOT EXISTS idx_scans_fair_id ON fair_scans(fair_id);
CREATE INDEX IF NOT EXISTS idx_scans_university ON fair_scans(university_registration_id);
CREATE INDEX IF NOT EXISTS idx_scans_pass_uuid ON fair_scans(pass_uuid);

-- ---------- RLS -------------------------------------------------
ALTER TABLE fair_student_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fair_scans ENABLE ROW LEVEL SECURITY;

-- All access goes through service-role API routes. No anon policies.
