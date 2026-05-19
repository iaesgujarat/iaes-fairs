import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FairLanding } from "@/components/FairLanding";
import { FairGrid } from "@/components/FairGrid";
import { BetweenFairsPage } from "@/components/BetweenFairsPage";
import {
  getActiveFairs,
  getLastConcludedFair,
  getPastFairs,
} from "@/lib/fair";

export const revalidate = 60;

export default async function Home() {
  const fairs = await getActiveFairs();

  // ── 0 fairs: between-fairs waitlist (v12, unchanged) ───────────
  // getActiveFairs() already excludes DRAFT + terminal states, so an
  // empty list means there is genuinely nothing public to show —
  // exactly the old `!fair || TERMINAL` condition, now upstream.
  if (fairs.length === 0) {
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

  // ── 1 fair: today's rich single-fair landing — UNCHANGED ───────
  // FairLanding is the verbatim extraction of the previous in-file
  // component: identical markup, components and props.
  if (fairs.length === 1) {
    return <FairLanding fair={fairs[0]} />;
  }

  // ── ≥2 fairs: equal-width column grid ──────────────────────────
  return (
    <>
      <SiteHeader />
      <main>
        <FairGrid fairs={fairs} />
      </main>
      <SiteFooter />
    </>
  );
}
