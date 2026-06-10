import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SignOutButton } from "@/components/SignOutButton";
import { SubscribersManager } from "@/components/admin/SubscribersManager";
import type { AnnouncementLead } from "@/types";

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const session = await createClient().auth.getUser();
  const userEmail = session.data.user?.email || "Admin";

  const supabase = createAdminClient();
  const { data: leads } = await supabase
    .from("announcement_leads")
    .select("*")
    .order("created_at", { ascending: false });

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
              <Link
                href="/admin/subscribers"
                className="font-medium text-navy underline-offset-4"
              >
                Subscribers
              </Link>
              <Link
                href="/admin/sequences"
                className="text-navy/65 hover:text-navy"
              >
                Invoice sequences
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-navy/70">{userEmail}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-navy">
            Subscribers
          </h1>
          <p className="mt-1 text-sm text-navy/60">
            People who used the website&rsquo;s &ldquo;Keep me posted&rdquo;
            form to hear about future fairs. Universities tell us when they
            like to travel; students tell us where they want to study — use
            this to plan and announce upcoming fairs.
          </p>
        </div>

        <SubscribersManager
          initialLeads={(leads as AnnouncementLead[]) || []}
        />
      </main>

      <SiteFooter />
    </>
  );
}
