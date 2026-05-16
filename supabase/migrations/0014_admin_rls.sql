-- 0014_admin_rls.sql
-- Re-assert RLS on admin_users AND fix the broken self-read policy.
--
-- Two separate bugs caused the admin-login failures:
--   1. @supabase/ssr cookie adapter on the old get/set/remove API
--      (fixed in lib/supabase/server.ts + middleware.ts).
--   2. The original "admin_users: self read" policy (0002_v2_schema.sql)
--      subqueries auth.users:
--          email = (SELECT email FROM auth.users WHERE id = auth.uid())
--      The `authenticated` / `anon` roles have NO SELECT privilege on
--      auth.users in Supabase, so that subquery is denied and the policy
--      can NEVER match a session-client read => middleware got null =>
--      not_authorized. Disabling RLS only *appeared* to fix it (no policy
--      evaluated). RLS MUST stay on: the anon key ships in the browser
--      bundle, so an RLS-off table is world-readable AND world-writable
--      (admin self-insert => privilege escalation).
--
-- The middleware now does the admin-membership lookup with the service
-- role (per the documented design in 0002), which bypasses RLS, so it no
-- longer depends on this policy at all. The policy is corrected here as
-- defense-in-depth for any other session-client read of admin_users.

-- 1. Re-enable RLS (undoes the accidental DISABLE).
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- Defense in depth: also force RLS so even the table owner is bound by it.
ALTER TABLE admin_users FORCE ROW LEVEL SECURITY;

-- 2. Replace the self-read policy with a correct one that reads the email
--    from the JWT claim (no auth.users access required). auth.jwt() reads
--    request.jwt.claims via current_setting, so it works for the
--    `authenticated` role without any table privileges.
DROP POLICY IF EXISTS "admin_users: self read" ON admin_users;
CREATE POLICY "admin_users: self read" ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
  );

-- 3. No INSERT/UPDATE/DELETE policies: writes are default-denied for anon
--    and authenticated. Admin management is done via the service role
--    (API routes / dashboard), which bypasses RLS. Explicitly revoke DML
--    from the public roles so a future RLS misconfiguration cannot re-open
--    the admin self-insert escalation path.
REVOKE INSERT, UPDATE, DELETE ON admin_users FROM anon, authenticated;
