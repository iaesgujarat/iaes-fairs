import type { FairItineraryStop, ItineraryEventType } from "@/types";
import { ITINERARY_EVENT_LABELS, itineraryTimeRange } from "@/lib/itinerary";

const EVENT_COLORS: Record<ItineraryEventType, string> = {
  CAMPUS_VISIT: "bg-navy/5 border-navy/20",
  OPEN_FAIR: "bg-gold/10 border-gold/40",
  TRAVEL: "bg-gray-50 border-gray-200",
  FREE: "bg-gray-50 border-gray-200",
};

function formatStopDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function FairItinerary({
  stops,
  arriveBy,
  departAfter,
  showCampusRegistrationNote = false,
}: {
  stops: FairItineraryStop[];
  arriveBy?: string | null;
  departAfter?: string | null;
  // v24 — campus visits are for that institution's own students, who
  // register via a link distributed by their institution (not a public
  // button). Show a small note saying so, instead of a register link.
  showCampusRegistrationNote?: boolean;
}) {
  if (!stops.length) return null;

  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-gold-500">
        Tour Itinerary
      </h3>

      <div className="space-y-3">
        {stops.map((stop, index) => (
          <div
            key={stop.id}
            className={`relative rounded-xl border p-4 ${
              EVENT_COLORS[stop.event_type]
            }`}
          >
            {stop.is_main_fair && (
              <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-gold px-3 py-0.5 text-[10px] font-bold text-navy shadow-sm">
                ★ MAIN FAIR
              </span>
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-navy">
                  <span className="text-xs font-bold text-white">
                    {index + 1}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">
                    {formatStopDate(stop.event_date)}
                  </p>

                  <p className="mt-0.5 font-serif text-base font-semibold leading-tight text-navy">
                    {stop.institution_name ?? stop.venue_name}
                  </p>

                  {stop.institution_name && stop.venue_name && (
                    <p className="mt-0.5 text-xs text-navy/60">
                      {stop.venue_name}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-navy/50">
                    {ITINERARY_EVENT_LABELS[stop.event_type]}
                    {stop.city ? ` · ${stop.city}` : ""}
                    {itineraryTimeRange(stop)
                      ? ` · ${itineraryTimeRange(stop)}`
                      : ""}
                  </p>

                  {stop.notes && (
                    <p className="mt-1.5 text-xs italic text-navy/60">
                      {stop.notes}
                    </p>
                  )}

                  {showCampusRegistrationNote &&
                    stop.event_type === "CAMPUS_VISIT" && (
                      <p className="mt-1.5 text-xs font-medium text-navy/70">
                        Students of this institution register through their
                        institution.
                      </p>
                    )}
                </div>
              </div>

              {!stop.is_confirmed && (
                <span className="flex-shrink-0 rounded-full border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
                  TBC
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {(arriveBy || departAfter) && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg bg-navy/5 px-4 py-3 sm:flex-row sm:gap-6">
          {arriveBy && (
            <p className="text-xs text-navy/70">
              <span className="font-semibold">Arrive by:</span>{" "}
              {formatStopDate(arriveBy)} (EOD)
            </p>
          )}
          {departAfter && (
            <p className="text-xs text-navy/70">
              <span className="font-semibold">Depart after:</span>{" "}
              {formatStopDate(departAfter)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
