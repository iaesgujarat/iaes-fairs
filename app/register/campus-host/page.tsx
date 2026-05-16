import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CampusHostRequestForm } from "@/components/CampusHostRequestForm";
import { isRegistrationOpen } from "@/lib/fairStatus";
import type { Fair } from "@/types";

export const dynamic = "force-dynamic";

export default async function CampusHostRequestPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("fairs")
    .select("*")
    .order("fair_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fair = data as Fair | null;
  const status = fair?.status;
  const active = !!fair?.campus_host_requests_active;

  // Gated end-to-end: needs an open fair AND the admin to have switched
  // the campus-host programme on for it.
  if (!fair || !isRegistrationOpen(status) || !active) {
    return (
      <>
        <SiteHeader variant="light" />
        <main className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
            Host a Fair on Your Campus
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-navy">
            This programme isn&rsquo;t open for requests yet
          </h1>
          <p className="mt-3 text-navy/70">
            IAES brings visiting U.S. university representatives directly to
            Indian higher-education campuses. This is an{" "}
            <span className="font-medium text-navy">
              invitation/activation-based programme
            </span>{" "}
            — IAES enables it per fair once visiting universities and an
            itinerary are confirmed, so it can&rsquo;t be self-started here.
          </p>
          <p className="mt-3 text-navy/70">
            If your institution would like to host a campus visit, write to us
            and we&rsquo;ll let you know as soon as it opens for the next fair:
          </p>
          <p className="mt-2">
            <a
              className="font-medium text-gold-600 hover:underline"
              href="mailto:eduadviser@iaesgujarat.org?subject=Campus%20Host%20Request%20%E2%80%94%20Interest"
            >
              eduadviser@iaesgujarat.org
            </a>
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
            Host a Fair on Your Campus
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
            Invite U.S. university reps to {fair.name}
          </h1>
          <p className="mt-3 text-navy/70">
            For Indian higher-education institutions that want visiting U.S.
            university representatives to come to their own campus. Tell us
            about your institution and proposed visit — IAES will review and
            get in touch to confirm.
          </p>
        </div>

        <div className="rounded-lg border border-navy/10 bg-white p-6 shadow-card sm:p-8">
          <CampusHostRequestForm fair={fair} />
        </div>

        <p className="mt-6 text-center text-xs text-navy/50">
          Submitting a request does not guarantee a visit — it is subject to
          IAES review and university availability.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
