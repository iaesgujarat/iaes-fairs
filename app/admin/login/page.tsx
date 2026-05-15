import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/Card";
import { AdminLoginForm } from "@/components/AdminLoginForm";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string; sent?: string; code?: string; next?: string };
}) {
  // Self-heal: if a magic-link landed here with ?code=… (because the link's
  // redirect_to pointed at /admin/login instead of /auth/callback), forward
  // to the real callback handler so the session can be established.
  if (searchParams.code) {
    const next = searchParams.next || "/admin/dashboard";
    redirect(
      `/auth/callback?code=${encodeURIComponent(
        searchParams.code
      )}&next=${encodeURIComponent(next)}`
    );
  }
  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-md px-6 py-16">
        <Card>
          <CardContent className="space-y-6 px-8 py-10">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
                IAES Admin
              </p>
              <h1 className="mt-2 font-serif text-2xl font-semibold text-navy">
                Sign in
              </h1>
              <p className="mt-2 text-sm text-navy/70">
                Enter your IAES email. We&rsquo;ll send a one-time secure link
                to sign you in.
              </p>
            </div>

            {searchParams.error === "not_authorized" && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                That email is not authorized for admin access. Contact{" "}
                <a href="mailto:eduadviser@iaesgujarat.org" className="underline">
                  eduadviser@iaesgujarat.org
                </a>
                .
              </div>
            )}

            {searchParams.sent === "1" && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Check your inbox — we&rsquo;ve sent a sign-in link. The link
                expires in one hour.
              </div>
            )}

            <Suspense>
              <AdminLoginForm />
            </Suspense>

            <p className="text-center text-xs text-navy/50">
              <Link href="/" className="hover:text-navy">
                &larr; Back to home
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
