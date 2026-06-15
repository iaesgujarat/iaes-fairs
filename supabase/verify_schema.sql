-- =============================================================
-- IAES Fairs — schema verification (READ-ONLY, safe to re-run)
-- Covers migrations 0001–0018. Any row with status <> 'OK' = a
-- migration not fully applied. Bottom row = overall summary.
--
-- Paste into the Supabase SQL Editor. To see the FULL pass/fail
-- list instead of only problems, delete the line marked
-- "show only problems first".
-- =============================================================
WITH
expected_tables(name) AS (VALUES
  ('fairs'),('registrations'),('billing_details'),('invoices'),
  ('payments'),('invoice_sequences'),('admin_users'),
  ('fair_student_passes'),('fair_scans'),('fair_status_log'),
  ('announcement_recipients'),('announcement_sends'),
  ('institution_registrations'),('campus_host_requests'),
  ('fair_itinerary'),('waitlist_signups')
),
expected_columns(tbl, col) AS (VALUES
  -- v3 / v6 lifecycle (foundational sanity)
  ('fairs','status'),('fairs','fair_date_start'),('fairs','fair_date_end'),
  ('fairs','arrive_by'),('fairs','depart_after'),
  ('fairs','price_standard_usd'),('fairs','payment_gateway_active'),
  ('registrations','terms_accepted'),('invoices','invoice_type'),
  ('invoice_sequences','series_type'),
  -- 0015 campus host
  ('fairs','campus_host_requests_active'),
  ('fairs','campus_host_activated_at'),
  ('fairs','campus_host_activation_note'),
  ('campus_host_requests','fair_id'),
  -- 0016 itinerary
  ('fair_itinerary','is_main_fair'),('fair_itinerary','is_public'),
  ('fair_itinerary','sort_order'),('fair_itinerary','event_type'),
  -- 0017 waitlist
  ('waitlist_signups','merged_to_recipients'),
  ('waitlist_signups','source_fair_id'),
  -- 0018 auto-conclude
  ('fairs','auto_concluded'),('fairs','thankyou_emails_sent_at'),
  ('fairs','stat_universities_participated'),
  ('fairs','stat_students_attended'),('fairs','stat_booth_scans'),
  ('fairs','stat_cities_visited'),('fairs','stat_cached_at')
),
expected_functions(name) AS (VALUES
  ('set_updated_at'),('set_main_fair_stop'),
  ('set_invoice_number'),('set_pass_number'),('generate_invoice_number')
),
rls_tables(name) AS (VALUES
  ('fairs'),('registrations'),('billing_details'),('invoices'),
  ('payments'),('invoice_sequences'),('admin_users'),
  ('fair_student_passes'),('fair_scans'),('fair_status_log'),
  ('announcement_recipients'),('announcement_sends'),
  ('institution_registrations'),('campus_host_requests'),
  ('fair_itinerary'),('waitlist_signups')
),
results AS (
  -- 1. Tables present
  SELECT '1. TABLE' AS check_group, name AS object,
         CASE WHEN to_regclass('public.'||name) IS NOT NULL
              THEN 'OK' ELSE 'MISSING' END AS status
  FROM expected_tables

  UNION ALL
  -- 2. Critical / additive columns present
  SELECT '2. COLUMN', tbl||'.'||col,
         CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.columns c
           WHERE c.table_schema='public' AND c.table_name=tbl
             AND c.column_name=col
         ) THEN 'OK' ELSE 'MISSING' END
  FROM expected_columns

  UNION ALL
  -- 3. Functions present (by name, any signature)
  SELECT '3. FUNCTION', name||'()',
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_proc p
           JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname=name
         ) THEN 'OK' ELSE 'MISSING' END
  FROM expected_functions

  UNION ALL
  -- 4. Row Level Security enabled
  SELECT '4. RLS', name,
         CASE
           WHEN to_regclass('public.'||name) IS NULL THEN 'MISSING (no table)'
           WHEN (SELECT relrowsecurity FROM pg_class
                 WHERE oid = ('public.'||name)::regclass) THEN 'OK'
           ELSE 'RLS OFF'
         END
  FROM rls_tables

  UNION ALL
  -- 5. announcement_recipients.source CHECK allows 'NEWSLETTER' (0017)
  SELECT '5. CONSTRAINT', 'announcement_recipients.source ~ NEWSLETTER',
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conrelid = 'public.announcement_recipients'::regclass
             AND contype='c'
             AND pg_get_constraintdef(oid) ILIKE '%NEWSLETTER%'
         ) THEN 'OK' ELSE 'MISSING' END

  UNION ALL
  -- 6. set_main_fair_stop type-signature (0016). to_regprocedure
  -- resolves by argument TYPES regardless of parameter names /
  -- pg_get_function_identity_arguments() formatting differences.
  SELECT '6. FUNCTION SIG', 'set_main_fair_stop(uuid,uuid)',
         CASE WHEN to_regprocedure('public.set_main_fair_stop(uuid,uuid)')
                   IS NOT NULL
              THEN 'OK' ELSE 'MISSING' END
)
SELECT * FROM results
WHERE status <> 'OK'                       -- show only problems first

UNION ALL
SELECT '0. SUMMARY',
       (SELECT count(*)||' checks, '||
               count(*) FILTER (WHERE status<>'OK')||' problem(s)'
        FROM results),
       CASE WHEN EXISTS (SELECT 1 FROM results WHERE status<>'OK')
            THEN '❌ SEE ROWS ABOVE' ELSE '✅ ALL OK' END
ORDER BY check_group, object;
