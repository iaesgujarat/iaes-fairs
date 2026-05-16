-- 0014_admin_rls.sql
-- Re-assert RLS on admin_users.
--
-- Context: a session-cookie bug (old @supabase/ssr get/set/remove adapter)
-- made the middleware's admin_users read run as `anon` instead of
-- `authenticated`, so the existing "admin_users: self read" policy denied it
-- and login bounced as not_authorized. The real fix was the cookie-API
-- migration in lib/supabase/server.ts + middleware.ts. RLS itself was always
-- correct and MUST stay enabled: the public anon key ships in the browser
-- bundle, so a table without RLS is world-readable AND world-writable
-- (admin self-insert => privilege escalation).

-- 1. Re-enable RLS (undoes the accidental DISABLE).
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- Defense in depth: also force RLS so even the table owner is bound by it.
ALTER TABLE admin_users FORCE ROW LEVEL SECURITY;

-- 2. Ensure the self-read policy exists (idempotent; mirrors 0002 schema).
--    Authenticated users may read ONLY their own admin row, which is exactly
--    what the middleware needs to answer "is this user an admin?".
DROP POLICY IF EXISTS "admin_users: self read" ON admin_users;
CREATE POLICY "admin_users: self read" ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 3. No INSERT/UPDATE/DELETE policies: writes are default-denied for anon
--    and authenticated. Admin management is done via the service role
--    (API routes / dashboard), which bypasses RLS. Explicitly revoke DML
--    from the public roles so a future RLS misconfiguration cannot re-open
--    the admin self-insert escalation path.
REVOKE INSERT, UPDATE, DELETE ON admin_users FROM anon, authenticated;
