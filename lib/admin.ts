import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns the authenticated user when they're an entry in `admin_users`,
 * `null` otherwise. Shared by every /api/admin/* route.
 */
export async function assertAdmin(): Promise<{ email: string } | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_users")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();
  return data ? { email: user.email } : null;
}
