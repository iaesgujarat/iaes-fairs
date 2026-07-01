import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  StudentRegisterForm,
  type EventContext,
} from "@/components/StudentRegisterForm";
import { isStudentPassOpen } from "@/lib/fairStatus";
import { formatDateLong } from "@/lib/mailerHelpers";
import type { Fair } from "@/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Register for the fair — IAES",
  robots: "noindex,nofollow",
};

interface StopRow {
  id: string;
  fair_id: string;
  event_type: string;
  event_date: string;
  institution_name: string | null;
  venue_name: string | null;
  city: string | null;
  start_time: string | null;
  end_time: string | null;
  fair?: Fair | Fair[] | null;
}

function timeLabel(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m ?? "00"} ${suffix}`;
}

export default async function EventRegisterPage({
  params,
}: {
  params: { stopId: string };
}) {
  const supabase = createAdminClient();

  const { data: stopData } = await supabase
    .from("fair_itinerary")
    .select(
      `id, fair_id, event_type, event_date, institution_name, venue_name,
       city, start_time, end_time, fair:fairs(*)`
    )
    .eq("id", params.stopId)
    .maybeSingle();
  if (!stopData) notFound();

  const stop = stopData as StopRow;
  const fair = (Array.isArray(stop.fair) ? stop.fair[0] : stop.fair) ?? null;
  if (!fair) notFound();

  const isCampus = stop.event_type === "CAMPUS_VISIT";
  const eventTitle = isCampus
    ? stop.institution_name || "Campus Visit"
    : stop.venue_name || "Open Fair";
  const when = `${formatDateLong(stop.event_date)}${
    stop.start_time ? ` · ${timeLabel(stop.start_time)}` : ""
  }${stop.end_time ? `–${timeLabel(stop.end_time)}` : ""}`;
  const where = [stop.venue_name, stop.city].filter(Boolean).join(", ");

  // Registration closed / no active fair → same message as /student.
  if (!isStudentPassOpen(fair.status)) {
    return (
      <>
        <SiteHeader variant="light" />
        <main className="mx-auto max-w-md px-6 py-16 text-center">
          <h1 className="font-serif text-2xl font-semibold text-navy">
            Registration is not currently open
          </h1>
          <p className="mt-3 text-sm text-navy/70">
            Passes for this event aren&rsquo;t available right now. Please
            check back, or contact IAES if you believe this is an error.
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

  // Open-Fair checkbox: only on a campus form, and only if the fair has a
  // public Open Fair stop distinct from this one.
  let openFair: EventContext["openFair"] = null;
  if (isCampus) {
    const { data: openStop } = await supabase
      .from("fair_itinerary")
      .select("event_date, venue_name")
      .eq("fair_id", fair.id)
      .eq("event_type", "OPEN_FAIR")
      .eq("is_public", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (openStop) {
      const os = openStop as { event_date: string; venue_name: string | null };
      openFair = {
        label: `Open Fair on ${formatDateLong(os.event_date)}${
          os.venue_name ? ` (${os.venue_name})` : ""
        }`,
      };
    }
  }

  const eventContext: EventContext = {
    stopId: stop.id,
    lockedInstitution: isCampus ? stop.institution_name : null,
    openFair,
  };

  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
            {fair.name}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
            {eventTitle}
          </h1>
          <p className="mt-2 text-sm text-navy/70">
            {when}
            {where ? ` · ${where}` : ""}
          </p>
          {isCampus && (
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-navy/60">
              Register below to get your free digital pass for this campus
              visit. Your details are captured under{" "}
              <strong>{eventTitle}</strong>.
            </p>
          )}
        </header>

        <div className="mt-10 rounded-2xl bg-white p-6 shadow-card sm:p-8">
          <StudentRegisterForm fair={fair} eventContext={eventContext} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
