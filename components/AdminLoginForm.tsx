"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/admin/dashboard`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      router.replace("/admin/login?sent=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send magic link.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        label="Email address"
        placeholder="you@iaesgujarat.org"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error || undefined}
      />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={sending}
        className="w-full"
      >
        {sending ? "Sending link..." : "Send Magic Link"}
      </Button>
    </form>
  );
}
