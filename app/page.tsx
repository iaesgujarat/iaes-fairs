import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FairHero } from "@/components/FairHero";
import { FairDetails } from "@/components/FairDetails";
import type { Fair } from "@/types";

export const revalidate = 60;

async function getActiveFair(): Promise<Fair | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("fairs")
      .select("*")
      .eq("is_active", true)
      .order("fair_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    return (data as Fair) ?? null;
  } catch {
    return null;
  }
}

const FALLBACK_FAIR: Fair = {
  id: "preview",
  name: "EducationUSA India Fair 2025",
  city: "Ahmedabad",
  venue: "Hotel Courtyard by Marriott, Ahmedabad",
  fair_date: "2025-11-15",
  registration_deadline: "2025-10-31",
  booth_price_usd: 500,
  booth_price_inr: 41500,
  max_universities: 30,
  description:
    "Annual flagship fair connecting American universities with top Gujarati students. Expected 1000+ student attendees.",
  is_active: true,
  created_at: new Date().toISOString(),
};

export default async function Home() {
  const fair = (await getActiveFair()) || FALLBACK_FAIR;

  return (
    <>
      <SiteHeader />
      <main>
        <FairHero fair={fair} />
        <FairDetails fair={fair} />

        <section className="bg-navy py-16 text-white">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
              Ready to meet Gujarat&rsquo;s next generation?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/75">
              Registration takes under three minutes. You&rsquo;ll receive a GST invoice by
              email, secure payment via Razorpay, and a digital booking
              confirmation.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-gold px-8 py-3.5 text-sm font-semibold text-navy shadow-card transition-colors hover:bg-gold-300"
            >
              Begin Registration
              <span aria-hidden>&rarr;</span>
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
