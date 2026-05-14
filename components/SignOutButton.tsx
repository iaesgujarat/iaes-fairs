"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <button
      onClick={signOut}
      className="text-sm text-navy/60 transition-colors hover:text-gold-600"
    >
      Sign out
    </button>
  );
}
