import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SignOutButton } from "@/components/SignOutButton";
import { FairForm } from "@/components/FairForm";

export const dynamic = "force-dynamic";

export default async function NewFairPage() {
  const session = await createClient().auth.getUser();
  const userEmail = session.data.user?.email || "Admin";

  return (
    <>
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-6">
            <Link href="/admin/dashboard" className="flex items-baseline gap-2">
              <span className="font-serif text-xl font-semibold text-navy">
                IAES
              </span>
              <span className="text-xs uppercase tracking-[0.18em] text-gold-500">
                Admin
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/admin/dashboard"
                className="text-navy/65 hover:text-navy"
              >
                Registrations
              </Link>
              <Link
                href="/admin/fairs"
                className="text-navy/65 hover:text-navy"
              >
                Fairs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-navy/70">{userEmail}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-2">
          <Link
            href="/admin/fairs"
            className="text-sm text-navy/55 hover:text-navy"
          >
            &larr; All fairs
          </Link>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-navy">
          Create Fair
        </h1>
        <p className="mt-1 text-sm text-navy/60">
          Saved as draft. You can publish it from the control panel once ready.
        </p>

        <div className="mt-8 rounded-lg border border-navy/10 bg-white p-6 shadow-card sm:p-8">
          <FairForm mode="create" />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
