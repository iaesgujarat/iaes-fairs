-- =============================================================
-- IAES Fairs — v24: per-event student registration + attendance.
--
-- Replaces the per-campus Google Forms. Each itinerary stop (a campus
-- visit like "Nirma University · 7 Aug", or the public Open Fair) gets
-- its own branded registration link. A student who registers via a
-- campus link is captured against THAT stop with the stop's institution
-- identity; a single "also attend the Open Fair" checkbox can add a
-- second signup for the open-fair stop.
--
-- One row per (student pass, event). `registered_at` = signed up;
-- `checked_in_at` = attended (stamped by the per-event door check-in,
-- so the SAME QR scanned at each day's door gives per-day attendance).
--
-- Student identity model is unchanged: still ONE pass per (email, fair)
-- in fair_student_passes; this table just links a pass to the events it
-- signed up for / attended.
--
-- Purely additive. Idempotent. Apply manually (SQL Editor).
-- RLS on, no public policy → service-role only (server routes).
-- Prereq: 0005 (fair_student_passes), 0016 (fair_itinerary).
-- =============================================================

CREATE TABLE IF NOT EXISTS student_event (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  pass_uuid         UUID NOT NULL
    REFERENCES fair_student_passes(pass_uuid) ON DELETE CASCADE,
  itinerary_stop_id UUID NOT NULL
    REFERENCES fair_itinerary(id) ON DELETE CASCADE,

  -- Denormalised so admin roster queries filter without a 2-hop join.
  fair_id           UUID,

  -- How the signup was created: 'campus_form' | 'open_fair_checkbox'
  -- | 'open_fair_form' | 'checkin' (a walk-in checked in with no prior
  -- signup row). Free text — advisory only.
  source            TEXT,

  registered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in_at     TIMESTAMPTZ,

  UNIQUE (pass_uuid, itinerary_stop_id)
);

CREATE INDEX IF NOT EXISTS student_event_stop_idx
  ON student_event (itinerary_stop_id);
CREATE INDEX IF NOT EXISTS student_event_pass_idx
  ON student_event (pass_uuid);
CREATE INDEX IF NOT EXISTS student_event_fair_idx
  ON student_event (fair_id);

ALTER TABLE student_event ENABLE ROW LEVEL SECURITY;
