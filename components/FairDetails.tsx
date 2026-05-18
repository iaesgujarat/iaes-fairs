import { CalendarDays, DollarSign, Users } from "lucide-react";
import type { Fair } from "@/types";
import { formatUSD, formatDateShort } from "@/lib/utils";
import { getFairPricing } from "@/lib/pricing";

function fairDatesLabel(fair: Fair): string {
  const start = fair.fair_date_start || fair.fair_date;
  const end = fair.fair_date_end;
  if (!end || end === start) return formatDateShort(start);
  const startD = new Date(start);
  const endD = new Date(end);
  const sameMonth =
    startD.getMonth() === endD.getMonth() &&
    startD.getFullYear() === endD.getFullYear();
  if (sameMonth) {
    return `${startD.getDate()}–${endD.getDate()} ${endD.toLocaleDateString(
      "en-IN",
      { month: "short", year: "numeric" }
    )}`;
  }
  return `${formatDateShort(start)} – ${formatDateShort(end)}`;
}

export function FairDetails({ fair }: { fair: Fair }) {
  const pricing = getFairPricing(fair);
  const cards = [
    {
      label: pricing.isEarlyBird ? "Booth Price (Early Bird)" : "Booth Price",
      value: formatUSD(pricing.priceUSD),
      sub: pricing.isEarlyBird
        ? `Save USD ${pricing.savingUSD} — ends ${
            pricing.earlybirdDeadline
              ? formatDateShort(pricing.earlybirdDeadline)
              : ""
          }`
        : "Pay in USD (no GST) or INR (plus GST)",
      icon: DollarSign,
    },
    {
      label: "Fair Dates",
      value: fairDatesLabel(fair),
      sub: fair.arrive_by
        ? `Arrive by ${formatDateShort(fair.arrive_by)}${
            fair.depart_after
              ? ` · depart after ${formatDateShort(fair.depart_after)}`
              : ""
          }`
        : fair.registration_deadline
        ? `Registration closes ${formatDateShort(fair.registration_deadline)}`
        : "Three-day fair + institute visits",
      icon: CalendarDays,
    },
    {
      label: "Expected Footfall",
      value: "1,000+ students",
      sub: "Across all academic streams",
      icon: Users,
    },
  ];

  return (
    <section id="fair-details" className="bg-cream py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-5 sm:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-lg border border-navy/10 bg-white p-6 shadow-card transition-shadow hover:shadow-hover"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-gold/15 text-gold-600">
                <c.icon className="h-5 w-5" />
              </div>
              <p className="text-xs uppercase tracking-wider text-navy/60">
                {c.label}
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-navy">
                {c.value}
              </p>
              <p className="mt-1 text-xs text-navy/60">{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-lg border border-navy/10 bg-white p-8 shadow-card sm:p-10">
          <h2 className="font-serif text-2xl font-semibold text-navy">
            About the Fair
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-navy/75">
            {fair.description ||
              "IAES (Indo American Education Society) is a not-for-profit institution advancing U.S. – India education exchange from Gujarat. Our annual international education fair connects accredited American universities with top student talent across Western India – students who arrive screened, prepared and ready to engage."}
          </p>
          <ul className="mt-6 grid gap-3 text-sm text-navy/80 sm:grid-cols-2">
            <li className="flex gap-2">
              <span className="text-gold-500">&#10003;</span> Curated, pre-registered student audience
            </li>
            <li className="flex gap-2">
              <span className="text-gold-500">&#10003;</span> Premium booth space &amp; institutional branding
            </li>
            <li className="flex gap-2">
              <span className="text-gold-500">&#10003;</span> Expert-led briefings on U.S. admissions, scholarships &amp; visas
            </li>
            <li className="flex gap-2">
              <span className="text-gold-500">&#10003;</span> Direct engagement with leading Gujarat institutions
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
