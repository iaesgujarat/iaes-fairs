import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FairHero } from "@/components/FairHero";
import { FairDetails } from "@/components/FairDetails";
import { FairItinerary } from "@/components/FairItinerary";
import { FairCTASection } from "@/components/FairCTASection";
import { AboutSociety } from "@/components/AboutSociety";
import type { Fair } from "@/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * The rich single-fair landing — extracted verbatim from app/page.tsx
 * (v16 Phase 1) so the per-fair detail page /fair/[fairId] renders the
 * EXACT same markup as the home page's one-fair branch. No visual or
 * behavioural change vs v1–v15; this is a faithful move, not a redesign
 * (same precedent as FairCTASection being extracted from the landing).
 *
 * Active fair = PUBLISHED, REGISTRATION_CLOSED, or ONGOING.
 */
export function FairLanding({ fair }: { fair: Fair }) {
  const status = fair.status ?? "PUBLISHED";

  // v24 — the public Open Fair stop backs the student pass CTA (its event
  // form → roster); campus visits get a "via your institution" note.
  const openFairStopId =
    (fair.itinerary ?? []).find(
      (s) => s.event_type === "OPEN_FAIR" && s.is_public
    )?.id ?? null;

  return (
    <>
      <SiteHeader />
      <main>
        {status === "ONGOING" && (
          <div className="bg-emerald-600 py-2 text-center text-sm font-medium text-white">
            <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
            Fair is happening now — open until {fair.fair_date_end
              ? formatDate(fair.fair_date_end)
              : "the end of the event"}
          </div>
        )}
        {status === "REGISTRATION_CLOSED" && (
          <div className="bg-amber-100 py-2 text-center text-sm font-medium text-amber-900">
            Registration closed
            {fair.registration_closed_at
              ? ` on ${formatDate(fair.registration_closed_at.slice(0, 10))}`
              : ""}
            . See you at the fair.
          </div>
        )}

        <FairHero fair={fair} />
        <FairDetails fair={fair} />
        <AboutSociety />

        {fair.itinerary && fair.itinerary.length > 0 && (
          <section className="mx-auto max-w-5xl px-6 py-14">
            <FairItinerary
              stops={fair.itinerary}
              arriveBy={fair.arrive_by}
              departAfter={fair.depart_after}
              showCampusRegistrationNote
            />
          </section>
        )}

        <FairCTASection fair={fair} openFairStopId={openFairStopId} />
      </main>
      <SiteFooter />
    </>
  );
}
