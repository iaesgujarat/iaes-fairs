import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FairHero } from "@/components/FairHero";
import { FairDetails } from "@/components/FairDetails";
import { FairItinerary } from "@/components/FairItinerary";
import { FairCTASection } from "@/components/FairCTASection";
import { AboutSociety } from "@/components/AboutSociety";
import { BetweenFairsPage } from "@/components/BetweenFairsPage";
import {
  getActiveFair,
  getLastConcludedFair,
  getPastFairs,
} from "@/lib/fair";
import type { Fair } from "@/types";

export const revalidate = 60;

const TERMINAL = ["CANCELLED", "COMPLETED", "ARCHIVED"];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function Home() {
  const fair = await getActiveFair();

  // No active fair (concluded / cancelled / draft / none) → the
  // landing page automatically becomes the between-fairs waitlist.
  // Fully automatic: publishing the next fair flips it back.
  if (!fair || TERMINAL.includes(fair.status ?? "")) {
    const [lastFair, pastFairs] = await Promise.all([
      getLastConcludedFair(),
      getPastFairs(),
    ]);
    return (
      <>
        <SiteHeader />
        <BetweenFairsPage lastFair={lastFair} pastFairs={pastFairs} />
        <SiteFooter />
      </>
    );
  }

  return <FairLanding fair={fair} />;
}

// ----------------------------------------------------------------
// Active fair — PUBLISHED, REGISTRATION_CLOSED, ONGOING
// ----------------------------------------------------------------
function FairLanding({ fair }: { fair: Fair }) {
  const status = fair.status ?? "PUBLISHED";

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
            />
          </section>
        )}

        <FairCTASection fair={fair} />
      </main>
      <SiteFooter />
    </>
  );
}
