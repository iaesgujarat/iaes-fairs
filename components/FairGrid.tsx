import Link from "next/link";
import { getFairPricing } from "@/lib/pricing";
import type { Fair } from "@/types";

// ── date helpers ────────────────────────────────────────────────
function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start);
  const full: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  if (!end) return s.toLocaleDateString("en-IN", full);
  const e = new Date(end);
  if (
    s.getMonth() === e.getMonth() &&
    s.getFullYear() === e.getFullYear()
  ) {
    return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    })}`;
  }
  return `${s.toLocaleDateString("en-IN", full)} – ${e.toLocaleDateString(
    "en-IN",
    full
  )}`;
}

function formatShort(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function formatDeadline(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Badge driven by STATUS, not payment_gateway_active. Gateway-off is
// the normal pre-payment (proforma) state — registration is still
// open — so a published fair is never mislabelled "Coming soon".
function statusBadge(fair: Fair): { label: string; className: string } {
  const status = fair.status ?? "PUBLISHED";
  if (status === "ONGOING")
    return { label: "● Live now", className: "bg-emerald-600 text-white" };
  if (status === "REGISTRATION_CLOSED")
    return {
      label: "Registration closed",
      className: "bg-amber-100 text-amber-900",
    };
  return { label: "Registration open", className: "bg-gold text-navy" };
}

export function FairGrid({ fairs }: { fairs: Fair[] }) {
  const cols =
    fairs.length >= 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2";

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-3xl font-semibold text-navy sm:text-4xl">
          Upcoming IAES Education Fairs
        </h1>
        <p className="mt-3 text-sm text-gray-500">
          {fairs.length} fairs are currently open — choose one to view its
          itinerary and register.
        </p>
      </div>

      <div className={`grid gap-6 ${cols}`}>
        {fairs.map((fair, i) => (
          <FairCard key={fair.id} fair={fair} isPrimary={i === 0} />
        ))}
      </div>
    </section>
  );
}

function FairCard({
  fair,
  isPrimary,
}: {
  fair: Fair;
  isPrimary: boolean;
}) {
  const badge = statusBadge(fair);
  const pricing = getFairPricing(fair);

  // Tailwind class sets for the two card treatments.
  const t = isPrimary
    ? {
        card: "bg-navy text-white",
        heading: "text-white",
        muted: "text-white/60",
        itemText: "text-white/85",
        divider: "border-white/10",
        price: "text-white",
        primaryCta: "bg-gold text-navy hover:bg-gold/90",
        secondaryCta:
          "border border-white/20 text-white/75 hover:bg-white/10",
        dotPlain: "bg-sky-400",
      }
    : {
        card: "bg-white border border-navy/10 shadow-card",
        heading: "text-navy",
        muted: "text-gray-500",
        itemText: "text-gray-700",
        divider: "border-navy/10",
        price: "text-navy",
        primaryCta: "bg-navy text-white hover:bg-navy/90",
        secondaryCta:
          "border border-navy/15 text-gray-600 hover:bg-[#F5F7FA]",
        dotPlain: "bg-sky-500",
      };

  const stops = fair.itinerary ?? [];
  const extra = stops.length - 3;

  return (
    <div
      className={`flex flex-col rounded-2xl p-7 ${t.card}`}
    >
      <span
        className={`mb-4 inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${badge.className}`}
      >
        {badge.label}
      </span>

      <h2
        className={`font-serif text-lg font-semibold leading-snug ${t.heading}`}
      >
        {fair.name}
      </h2>

      <p className={`mt-1 text-sm ${t.muted}`}>
        {formatDateRange(
          fair.fair_date_start ?? fair.fair_date,
          fair.fair_date_end ?? null
        )}
      </p>
      <p className={`text-xs ${t.muted}`}>{fair.city}, Gujarat</p>

      {stops.length > 0 && (
        <div className="mt-5 flex-1">
          {stops.slice(0, 3).map((stop) => (
            <div
              key={stop.id}
              className={`flex items-start gap-2 border-b py-1.5 text-xs ${t.divider}`}
            >
              <span
                className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                  stop.is_main_fair ? "bg-gold" : t.dotPlain
                }`}
              />
              <span className={`min-w-[44px] text-[11px] ${t.muted}`}>
                {formatShort(stop.event_date)}
              </span>
              <span className={t.itemText}>
                {stop.institution_name ?? stop.venue_name}
                {stop.is_main_fair && (
                  <span className="ml-1 text-[10px] text-gold">★</span>
                )}
                {!stop.is_confirmed && (
                  <span className={`ml-1 text-[10px] ${t.muted}`}>
                    [TBC]
                  </span>
                )}
              </span>
            </div>
          ))}
          {extra > 0 && (
            <p className={`mt-1.5 text-[11px] ${t.muted}`}>
              +{extra} more stop{extra > 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      <div className={stops.length > 0 ? "mt-5" : "mt-5 flex-1"}>
        {pricing.isEarlyBird && pricing.earlybirdDeadline && (
          <span className="mb-1.5 inline-flex w-fit items-center rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-semibold text-navy">
            ⭐ Early bird · ends {formatDeadline(pricing.earlybirdDeadline)}
          </span>
        )}

        <p className={`text-2xl font-bold ${t.price}`}>
          {pricing.priceUSD
            ? `USD ${pricing.priceUSD.toLocaleString()}`
            : "TBC"}
        </p>

        {pricing.isEarlyBird && pricing.standardUSD ? (
          <p className={`mb-3 text-[11px] ${t.muted}`}>
            USD {pricing.standardUSD.toLocaleString()} after{" "}
            {formatDeadline(pricing.earlybirdDeadline)}
          </p>
        ) : (
          <p className={`mb-3 text-[11px] ${t.muted}`}>per university booth</p>
        )}

        <Link
          href={`/fair/${fair.id}`}
          className={`block w-full rounded-md px-6 py-2.5 text-center text-sm font-semibold transition-colors ${t.primaryCta}`}
        >
          View Fair Details →
        </Link>

        <Link
          href={`/fair/${fair.id}#register`}
          className={`mt-2 block w-full rounded-md px-6 py-2 text-center text-xs transition-colors ${t.secondaryCta}`}
        >
          Indian institution? Register free →
        </Link>
      </div>
    </div>
  );
}
