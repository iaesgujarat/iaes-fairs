import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SurveyForm } from "@/components/SurveyForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Fair feedback — IAES",
  robots: "noindex,nofollow",
};

export default async function SurveyPage({
  params,
}: {
  params: { registrationId: string };
}) {
  const supabase = createAdminClient();

  const { data: reg } = await supabase
    .from("registrations")
    .select(`id, university_name, contact_name, fair:fairs(name, city)`)
    .eq("id", params.registrationId)
    .maybeSingle();
  if (!reg) notFound();

  type RegRow = {
    id: string;
    university_name: string;
    contact_name: string | null;
    fair?:
      | { name: string; city: string | null }
      | { name: string; city: string | null }[]
      | null;
  };
  const r = reg as RegRow;
  const fair = Array.isArray(r.fair) ? r.fair[0] : r.fair;

  const { data: existing } = await supabase
    .from("fair_feedback")
    .select(
      `overall_rating, leads_rating, organization_rating, recommend_rating,
       what_went_well, what_to_improve, additional_comments`
    )
    .eq("registration_id", r.id)
    .maybeSingle();

  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
            {fair?.name ?? "IAES International Education Fair"}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
            How did the fair go for you?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-navy/70">
            Thank you for joining us
            {fair?.city ? ` in ${fair.city}` : ""}. A couple of minutes of
            honest feedback from <strong>{r.university_name}</strong> helps us
            make the next IAES fair better for you.
          </p>
        </header>

        <div className="mt-10 rounded-2xl bg-white p-6 shadow-card sm:p-8">
          <SurveyForm registrationId={r.id} existing={existing ?? null} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
