-- =============================================================
-- IAES Fairs — one-time pre-launch cleanup
--
-- DESTRUCTIVE. Run this only once, after 0010 has been applied.
-- Wipes every university registration row + dependent rows so
-- the first real registration receives IAES-FAIR-{CUR}-2026-001.
--
-- Defensive: each step checks whether the target table/sequence
-- exists before touching it, so this script is safe to run even
-- on a Supabase project where migrations 0005 (student passes)
-- or 0007 (announcements) haven't been applied yet.
--
-- Resets when present:
--   * invoice_counter_inr      restart at 1
--   * invoice_counter_usd      restart at 1
--   * pass_counter             restart at 1
--   * institution_registrations cleared (test data only)
--   * fair_student_passes      cleared (test data only)
--   * fair_scans               cleared (test data only)
--   * announcement_recipients  left alone (mailing list intact)
--
-- ON DELETE CASCADE on dependent FKs handles invoices /
-- billing_details / payments / fair_scans automatically when the
-- parent table exists.
-- =============================================================

-- ---------- 1. Wipe test data (only tables that exist) ---------
DO $$
BEGIN
  IF to_regclass('public.fair_scans') IS NOT NULL THEN
    DELETE FROM fair_scans;
  END IF;

  IF to_regclass('public.fair_student_passes') IS NOT NULL THEN
    DELETE FROM fair_student_passes;
  END IF;

  IF to_regclass('public.institution_registrations') IS NOT NULL THEN
    DELETE FROM institution_registrations;
  END IF;

  IF to_regclass('public.registrations') IS NOT NULL THEN
    DELETE FROM registrations;
  END IF;
END $$;

-- ---------- 2. Reset sequences (only if they exist) ------------
DO $$
BEGIN
  IF to_regclass('public.invoice_counter_inr') IS NOT NULL THEN
    ALTER SEQUENCE invoice_counter_inr RESTART WITH 1;
  END IF;

  IF to_regclass('public.invoice_counter_usd') IS NOT NULL THEN
    ALTER SEQUENCE invoice_counter_usd RESTART WITH 1;
  END IF;

  IF to_regclass('public.pass_counter') IS NOT NULL THEN
    ALTER SEQUENCE pass_counter RESTART WITH 1;
  END IF;
END $$;
