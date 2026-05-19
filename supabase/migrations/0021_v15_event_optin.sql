-- =============================================================
-- IAES Fairs — v15: per-event attendance opt-in.
--
-- A participating university ticks which v11 itinerary stops it will
-- attend (at registration; admin-editable later). Drives travel /
-- meal / headcount planning per venue.
--
-- Keyed on the itinerary stop UUID → survives v11 reorder/edit
-- (only sort_order/day_number change, not id); deletes cascade.
--
-- Purely additive. Idempotent. Apply manually (SQL Editor).
-- Prereq: 0001 (registrations), 0016 (fair_itinerary).
-- =============================================================

CREATE TABLE IF NOT EXISTS registration_event_optin (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL
    REFERENCES registrations(id) ON DELETE CASCADE,
  itinerary_stop_id UUID NOT NULL
    REFERENCES fair_itinerary(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (registration_id, itinerary_stop_id)
);

CREATE INDEX IF NOT EXISTS idx_reg_event_optin_reg
  ON registration_event_optin(registration_id);
CREATE INDEX IF NOT EXISTS idx_reg_event_optin_stop
  ON registration_event_optin(itinerary_stop_id);

-- Service-role only: the public registration form posts through
-- /api/register (service role); admin reads/writes via service role.
ALTER TABLE registration_event_optin ENABLE ROW LEVEL SECURITY;
