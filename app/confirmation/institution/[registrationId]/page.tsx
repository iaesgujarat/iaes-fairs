import { notFound } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/Card";
import type { Fair, InstitutionRegistration } from "@/types";

export const dynamic = "force-dynamic";

function fmtDateRange(fair: Fair): string {
  const start = fair.fair_date_start || fair.fair_date;
  const end = fair.fair_date_end || fair.fair_date;
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  if (!end || end === start) {
    return new Date(start).toLocaleDateString("en-IN", opts);
  }
  return `${new Date(start).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
  })} – ${new Date(end).toLocaleDateString("en-IN", opts)}`;
}

export default async function InstitutionConfirmationPage({
  params,
}: {
  params: { registrationId: string };
}) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("institution_registrations")
    .select(`*, fair:fairs(*)`)
    .eq("id", params.registrationId)
    .maybeSingle();

  if (!data) notFound();

  const reg = data as InstitutionRegistration & { fair: Fair };
  const fair = reg.fair;

  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <Card>
          <CardContent className="space-y-8 px-8 py-10 text-center sm:px-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
                Registration Confirmed
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
                You&rsquo;re in.
              </h1>
              <p className="mt-3 text-navy/70">
                {reg.institution_name} is registered for{" "}
                <strong>{fair.name}</strong>. We&rsquo;ll be in touch with the
                detailed itinerary closer to the fair date.
              </p>
            </div>

            <div className="grid gap-4 rounded-md border border-navy/10 bg-cream/60 p-6 text-left text-sm">
              <Row label="Institution" value={reg.institution_name} />
              <Row label="Type" value={reg.institution_type} />
              <Row label="Location" value={`${reg.city}, ${reg.state}`} />
              <Row
                label="Expected Students"
                value={reg.expected_student_count.toString()}
              />
              <Row label="Fair Dates" value={fmtDateRange(fair)} />
              <Row label="Venue" value={fair.venue || fair.city} />
            </div>

            <p className="text-sm text-navy/70">
              A confirmation email has been sent to <strong>{reg.email}</strong>
              .
            </p>

            <div className="pt-2 text-xs text-navy/50">
              Questions? Email{" "}
              <a
                href="mailto:eduadviser@iaesgujarat.org"
                className="text-gold-600 hover:underline"
              >
                eduadviser@iaesgujarat.org
              </a>{" "}
              or call +91 97264 80899.
            </div>

            <Link
              href="/"
              className="inline-block text-sm text-navy hover:text-gold-600"
            >
              &larr; Back to home
            </Link>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-navy/10 pb-2 last:border-0 last:pb-0">
      <span className="text-xs uppercase tracking-wider text-navy/55">
        {label}
      </span>
      <span className="text-navy/85">{value}</span>
    </div>
  );
}
