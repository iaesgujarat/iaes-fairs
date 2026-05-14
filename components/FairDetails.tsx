import { CalendarDays, IndianRupee, Users } from "lucide-react";
import type { Fair } from "@/types";
import { formatINR, formatUSD, formatDateShort } from "@/lib/utils";

export function FairDetails({ fair }: { fair: Fair }) {
  const cards = [
    {
      label: "Booth Price",
      value: formatINR(fair.booth_price_inr),
      sub: `${formatUSD(fair.booth_price_usd)} · includes 18% GST`,
      icon: IndianRupee,
    },
    {
      label: "Registration Deadline",
      value: fair.registration_deadline
        ? formatDateShort(fair.registration_deadline)
        : "Rolling",
      sub: "Early registration recommended",
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
              "IAES (Indo American Education Society) is a not-for-profit institution advancing U.S. – India education exchange from Gujarat. Our annual EducationUSA Fair connects accredited American universities with top student talent across Western India – students who arrive screened, prepared and ready to engage."}
          </p>
          <ul className="mt-6 grid gap-3 text-sm text-navy/80 sm:grid-cols-2">
            <li className="flex gap-2">
              <span className="text-gold-500">&#10003;</span> Curated, pre-registered student audience
            </li>
            <li className="flex gap-2">
              <span className="text-gold-500">&#10003;</span> Premium booth space &amp; institutional branding
            </li>
            <li className="flex gap-2">
              <span className="text-gold-500">&#10003;</span> EducationUSA-aligned briefing session
            </li>
            <li className="flex gap-2">
              <span className="text-gold-500">&#10003;</span> Government &amp; consulate engagement
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
