-- =============================================================
-- IAES Fairs — RLS audit fix: fairs visibility
--
-- Problem: the 0002 policy reads "USING (is_active = true)", but
-- v6 lifecycle flips is_active=false on COMPLETED and CANCELLED
-- fairs. The public landing page wants to render those states
-- (per v6 §14), so the anon role needs to read them.
--
-- DRAFT and ARCHIVED fairs stay hidden from anon — they are
-- admin-only views.
-- =============================================================

DROP POLICY IF EXISTS "fairs: anon read active" ON fairs;

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
