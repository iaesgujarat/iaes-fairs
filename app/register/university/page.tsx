import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { RegistrationForm } from "@/components/RegistrationForm";
import { isRegistrationOpen } from "@/lib/fairStatus";
import type { Fair } from "@/types";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const supabase = createClient();
  const { data: fair } = await supabase
    .from("fairs")
    .select("*")
    .order("fair_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = (fair as Fair | null)?.status;
  if (!fair || !isRegistrationOpen(status)) {
    return (
      <>
        <SiteHeader variant="light" />
        <main className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="font-serif text-3xl font-semibold text-navy">
            Registration is currently closed
          </h1>
          <p className="mt-3 text-navy/70">
            {status === "REGISTRATION_CLOSED"
              ? "Registration for this fair has closed."
              : status === "ONGOING"
              ? "The fair is already underway. Registration is closed."
              : status === "COMPLETED" || status === "ARCHIVED"
              ? "This fair has concluded. The next fair will be announced soon."
              : status === "CANCELLED"
              ? "This fair has been cancelled."
              : "There is no active fair accepting registrations at this time."}{" "}
            For questions, contact{" "}
            <a
              className="text-gold-600 hover:underline"
              href="mailto:eduadviser@iaesgujarat.org"
            >
              eduadviser@iaesgujarat.org
            </a>
            .
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

  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
            University Registration
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
            Reserve your booth at the {fair.name}
          </h1>
          <p className="mt-3 text-navy/70">
            Three short steps. You&rsquo;ll receive an invoice immediately and can
            pay online via Razorpay (USD or INR).
          </p>
        </div>

        <div className="rounded-lg border border-navy/10 bg-white p-6 shadow-card sm:p-8">
          <RegistrationForm fair={fair as Fair} />
        </div>

        <p className="mt-6 text-center text-xs text-navy/50">
          By registering you agree to our payment and cancellation policy.
          Cancellations must be requested at least 21 days before the fair date
          for partial refunds.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
