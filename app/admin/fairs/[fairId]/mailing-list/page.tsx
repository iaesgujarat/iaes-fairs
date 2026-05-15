import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SignOutButton } from "@/components/SignOutButton";
import { MailingListManager } from "@/components/MailingListManager";
import type { Fair, AnnouncementRecipient } from "@/types";

export const dynamic = "force-dynamic";

export default async function MailingListPage({
  params,
}: {
  params: { fairId: string };
}) {
  const session = await createClient().auth.getUser();
  const userEmail = session.data.user?.email || "Admin";

  const supabase = createAdminClient();
  const [{ data: fair }, { data: recipients }] = await Promise.all([
    supabase.from("fairs").select("*").eq("id", params.fairId).maybeSingle(),
    supabase
      .from("announcement_recipients")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  if (!fair) notFound();
  const f = fair as Fair;

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

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-2">
          <Link
            href={`/admin/fairs/${f.id}`}
            className="text-sm text-navy/55 hover:text-navy"
          >
            &larr; Back to {f.name}
          </Link>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-navy">
          Mailing List
        </h1>
        <p className="mt-1 text-sm text-navy/60">
          Shared across all fairs. Add manually, upload a CSV, or import
          past-participant emails from previous registrations.
        </p>

        <div className="mt-8">
          <MailingListManager
            initialRecipients={(recipients as AnnouncementRecipient[]) || []}
          />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
