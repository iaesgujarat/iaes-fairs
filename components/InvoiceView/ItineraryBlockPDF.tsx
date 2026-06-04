import { Text, View, StyleSheet } from "@react-pdf/renderer";
import type { FairItineraryStop } from "@/types";
import { formatDateShort } from "@/lib/utils";
import { itineraryTimeRange } from "@/lib/itinerary";

const s = StyleSheet.create({
  section: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  heading: {
    fontSize: 8,
    fontWeight: 700,
    color: "#0B2B5C",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  row: { marginBottom: 6 },
  day: { fontSize: 7.5, fontWeight: 700, color: "#0B2B5C" },
  venue: { fontSize: 7.5, color: "#374151", marginTop: 1 },
  note: {
    fontSize: 7,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginTop: 1,
  },
  footer: { fontSize: 7, color: "#6B7280", marginTop: 6 },
});

export function ItineraryBlockPDF({
  stops,
  arriveBy,
  departAfter,
}: {
  stops: FairItineraryStop[];
  arriveBy?: string | null;
  departAfter?: string | null;
}) {
  if (!stops.length) return null;

  return (
    <View style={s.section} wrap={false}>
      <Text style={s.heading}>Tour Itinerary</Text>

      {stops.map((stop) => {
        const time = itineraryTimeRange(stop);
        return (
          <View style={s.row} key={stop.id}>
            <Text style={s.day}>
              Day {stop.day_number} · {formatDateShort(stop.event_date)}
            </Text>
            <Text style={s.venue}>
              {stop.institution_name ?? stop.venue_name}
              {stop.institution_name && stop.venue_name
                ? `, ${stop.venue_name}`
                : ""}
              {stop.city ? ` · ${stop.city}` : ""}
              {time ? ` · ${time}` : ""}
              {stop.is_main_fair ? "  [MAIN FAIR]" : ""}
              {!stop.is_confirmed ? "  [TBC]" : ""}
            </Text>
            {stop.notes ? (
              <Text style={s.note}>{stop.notes}</Text>
            ) : null}
          </View>
        );
      })}

      {(arriveBy || departAfter) && (
        <Text style={s.footer}>
          {arriveBy ? `Arrive by: ${formatDateShort(arriveBy)} (EOD)` : ""}
          {arriveBy && departAfter ? " · " : ""}
          {departAfter ? `Depart after: ${formatDateShort(departAfter)}` : ""}
        </Text>
      )}
      <Text style={s.footer}>
        Transportation and meals included for all tour days.
      </Text>
    </View>
  );
}
