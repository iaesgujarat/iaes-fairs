import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteFooter } from "@/components/SiteFooter";
import { EventRosterManager } from "@/components/admin/EventRosterManager";
import type { Fair, FairItineraryStop } from "@/types";
import type { StudentEventRosterRow } from "@/components/admin/EventRosterManager";

export const dynamic = "force-dynamic";

export default async function FairEventsPage({
  params,
}: {
  params: { fairId: string };
}) {
  const supabase = createAdminClient();

  const { data: fairData } = await supabase
    .from("fairs")
    .select("id, name")
    .eq("id", params.fairId)
    .maybeSingle();
  if (!fairData) notFound();
  const fair = fairData as Pick<Fair, "id" | "name">;

  const { data: stopsData } = await supabase
    .from("fair_itinerary")
    .select(
      `id, event_date, event_type, institution_name, venue_name, city,
       is_public, sort_order`
    )
    .eq("fair_id", params.fairId)
    .order("sort_order", { ascending: true });
  const stops = (stopsData as FairItineraryStop[] | null) ?? [];

  // Signups + attendance joined to the pass profile. Empty (never throws)
  // if 0030 isn't applied yet.
  const { data: rowsData } = await supabase
    .from("student_event")
    .select(
      `itinerary_stop_id, registered_at, checked_in_at, source,
       pass:fair_student_passes(pass_number, full_name, email, phone,
         institution_name, current_course, current_semester,
         field_of_interest, preferred_countries, budget_range,
         english_exam, data_sharing_consent)`
    )
    .eq("fair_id", params.fairId)
    .order("registered_at", { ascending: false });
  const rows = (rowsData as StudentEventRosterRow[] | null) ?? [];

  return (
    <>
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href={`/admin/fairs/${fair.id}`}
            className="text-sm text-navy/65 hover:text-navy"
          >
            &larr; Back to {fair.name}
          </Link>
          <span className="text-xs uppercase tracking-[0.18em] text-gold-500">
            Event registrations
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-navy">
            Per-event student registrations
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-navy/60">
            Each campus visit and the Open Fair has its own registration link —
            share it and students who sign up are captured under that event.
            Copy a link, see live counts, view the roster, and export CSV.
          </p>
        </div>

        <EventRosterManager fairName={fair.name} stops={stops} rows={rows} />
      </main>

      <SiteFooter />
    </>
  );
}
