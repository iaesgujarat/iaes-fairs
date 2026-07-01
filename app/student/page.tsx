import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StudentRegisterForm } from "@/components/StudentRegisterForm";
import { isStudentPassOpen } from "@/lib/fairStatus";
import type { Fair } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Get Your Free Pass — IAES Education Fair 2026",
  description:
    "Register for a free digital pass to the IAES U.S. University Education Fair. Show it at booths to share your profile with reps.",
};

export default async function StudentPage() {
  const supabase = createClient();
  const { data: fair } = await supabase
    .from("fairs")
    .select("*")
    .order("fair_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = (fair as Fair | null)?.status;
  if (!fair || !isStudentPassOpen(status)) {
    return (
      <>
        <SiteHeader variant="light" />
        <main className="mx-auto max-w-md px-6 py-16">
          <h1 className="font-serif text-2xl font-semibold text-navy">
            Passes are not currently available
          </h1>
          <p className="mt-3 text-sm text-navy/70">
            {status === "COMPLETED" || status === "ARCHIVED"
              ? "This fair has concluded. The next fair will be announced soon."
              : status === "CANCELLED"
              ? "This fair has been cancelled."
              : "There is no active fair right now. Check back soon."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-navy hover:text-gold-600"
          >
            &larr; Back to home
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  }

  const f = fair as Fair;
  const start = f.fair_date_start || f.fair_date;
  const end = f.fair_date_end || f.fair_date;
  const dateRange =
    !end || end === start
      ? new Date(start).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : `${new Date(start).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
        })} – ${new Date(end).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`;

  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
            {f.name}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
            Get your free pass
          </h1>
          <p className="mt-2 text-sm font-medium text-navy/70">
            {dateRange}
            {f.city ? ` · ${f.city}` : ""}
          </p>
          <p className="mt-3 text-navy/70">
            One quick form. We&rsquo;ll email you a QR code to show at each
            university booth at this fair.
          </p>
        </div>

        <div className="rounded-lg border border-navy/10 bg-white p-6 shadow-card sm:p-8">
          <StudentRegisterForm fair={f} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
