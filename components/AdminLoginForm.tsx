"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

type Phase = "request" | "verify";

/**
 * Admin sign-in via email OTP (Supabase OTP length is configurable
 * 6–10; the input accepts the full code as emailed).
 *
 * Primary path: signInWithOtp → email a code → verifyOtp({type:"email"}).
 * verifyOtp needs NO PKCE code-verifier and NO redirect, so it is
 * immune to the "link opened in a different browser / in-app webview /
 * pre-fetched by a scanner" failure (pkce_code_verifier_not_found).
 *
 * We KEEP emailRedirectTo so the same email's magic link still works
 * as a fallback (existing /auth/callback PKCE path unchanged) — purely
 * additive, no lockout risk.
 *
 * NOTE: requires the Supabase "Magic Link" email template to include
 * the code, e.g.  `{{ .Token }}`  — without it no code is emailed.
 */
export function AdminLoginForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin/dashboard`,
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      setPhase("verify");
      setNotice(
        "We emailed your sign-in code (and a backup link). Enter the code below — it expires in 1 hour."
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not send the sign-in code."
      );
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const token = code.replace(/\D/g, "");
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Invalid or expired code."
      );
    } finally {
      setBusy(false);
    }
  }

  if (phase === "verify") {
    return (
      <form onSubmit={verify} className="space-y-4">
        {notice && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </div>
        )}
        <p className="text-sm text-navy/70">
          Code sent to{" "}
          <span className="font-medium text-navy">{email}</span>
        </p>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          label="Sign-in code"
          placeholder="••••••••"
          required
          value={code}
          onChange={(e) =>
            // Supabase email-OTP length is configurable (6–10). Never
            // hard-cap at 6 — accept the full code as emailed.
            setCode(e.target.value.replace(/\D/g, "").slice(0, 10))
          }
          error={error || undefined}
          className="text-center text-2xl tracking-[0.5em]"
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={busy}
          className="w-full"
        >
          {busy ? "Verifying…" : "Verify & sign in"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setPhase("request");
            setCode("");
            setError(null);
            setNotice(null);
          }}
          className="block w-full text-center text-xs text-navy/55 hover:text-navy"
        >
          Use a different email / resend code
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
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
        loading={busy}
        className="w-full"
      >
        {busy ? "Sending code…" : "Email me a sign-in code"}
      </Button>
    </form>
  );
}
