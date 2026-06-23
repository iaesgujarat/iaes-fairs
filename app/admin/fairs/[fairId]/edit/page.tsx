import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SignOutButton } from "@/components/SignOutButton";
import { FairForm } from "@/components/FairForm";
import { ItineraryBuilder } from "@/components/ItineraryBuilder";
import { STATUS_LABELS } from "@/lib/fairStatus";
import type { Fair, FairItineraryStop } from "@/types";

export const dynamic = "force-dynamic";

export default async function EditFairPage({
  params,
}: {
  params: { fairId: string };
}) {
  const session = await createClient().auth.getUser();
  const userEmail = session.data.user?.email || "Admin";

  const supabase = createAdminClient();
  const { data: fair } = await supabase
    .from("fairs")
    .select("*")
    .eq("id", params.fairId)
    .maybeSingle();
  if (!fair) notFound();

  const f = fair as Fair;
  const status = f.status ?? "DRAFT";
  const editable = status === "DRAFT" || status === "PUBLISHED";

  // Itinerary is operational data — editable in any status (venues get
  // confirmed right up to fair time). Empty if the table isn't migrated yet.
  const { data: stopsData } = await supabase
    .from("fair_itinerary")
    .select("*")
    .eq("fair_id", params.fairId)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true });
  const stops = (stopsData as FairItineraryStop[] | null) ?? [];

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
            href={`/admin/fairs/${f.id}`}
            className="text-sm text-navy/55 hover:text-navy"
          >
            &larr; Back to control panel
          </Link>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-navy">
          Edit Fair
        </h1>
        <p className="mt-1 text-sm text-navy/60">
          Status: <strong>{STATUS_LABELS[status]}</strong>
        </p>

        {!editable ? (
          <div className="mt-8 rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p>
              This fair is in <strong>{STATUS_LABELS[status]}</strong> state and
              cannot be edited. Edits are only allowed while the fair is in
              Draft or Published state.
            </p>
            <Link
              href={`/admin/fairs/${f.id}`}
              className="mt-3 inline-block font-medium text-navy underline"
            >
              Back to control panel
            </Link>
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-navy/10 bg-white p-6 shadow-card sm:p-8">
            <FairForm mode="edit" fair={f} />
          </div>
        )}

        <section id="itinerary" className="mt-12 scroll-mt-20">
          <h2 className="font-serif text-2xl font-semibold text-navy">
            Fair Itinerary
          </h2>
          <p className="mt-1 text-sm text-navy/60">
            The single source of truth for tour stops — the landing page,
            invoices and the briefing email all read from this. Field edits
            save on blur; toggles save immediately. Stops sort automatically
            by date and start time, so add them in any order.
          </p>
          <div className="mt-6">
            <ItineraryBuilder fairId={f.id} initialStops={stops} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
