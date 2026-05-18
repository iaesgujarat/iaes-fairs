-- =============================================================
-- IAES Fairs — v11: Fair Itinerary (single source of truth for
-- all tour stops). Admin builds it → landing page renders it →
-- invoice/proforma PDF prints it → briefing email sends it.
--
-- Purely additive. Idempotent (IF NOT EXISTS / guarded seed).
-- Apply manually on the real Supabase project (SQL Editor).
-- Prereq: 0002 (provides set_updated_at()) already applied.
-- =============================================================

-- ---------- 1. Table ------------------------------------------
CREATE TABLE IF NOT EXISTS fair_itinerary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) ON DELETE CASCADE NOT NULL,

  day_number INTEGER NOT NULL,          -- 1,2,3 (display order)
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('CAMPUS_VISIT', 'OPEN_FAIR', 'TRAVEL', 'FREE')),

  institution_name TEXT,                -- null for OPEN_FAIR
  venue_name TEXT,
  city TEXT NOT NULL,
  address TEXT,

  start_time TIME,
  end_time TIME,

  is_main_fair BOOLEAN NOT NULL DEFAULT false,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT true,

  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fair_itinerary_fair
  ON fair_itinerary(fair_id);
CREATE INDEX IF NOT EXISTS idx_fair_itinerary_sort
  ON fair_itinerary(fair_id, sort_order);

-- updated_at trigger (reuses set_updated_at() from 0002)
DROP TRIGGER IF EXISTS trg_fair_itinerary_updated_at ON fair_itinerary;
CREATE TRIGGER trg_fair_itinerary_updated_at
  BEFORE UPDATE ON fair_itinerary
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- 2. Single main-fair enforcement -------------------
-- Always toggle is_main_fair via this function so at most ONE stop
-- per fair is the main fair. Never raw-UPDATE is_main_fair = true.
CREATE OR REPLACE FUNCTION set_main_fair_stop(
  p_fair_id UUID, p_stop_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE fair_itinerary SET is_main_fair = false
  WHERE fair_id = p_fair_id;
  UPDATE fair_itinerary SET is_main_fair = true
  WHERE id = p_stop_id AND fair_id = p_fair_id;
END;
$$ LANGUAGE plpgsql;

-- ---------- 3. RLS --------------------------------------------
-- Public (browser anon key) may read ONLY public stops — the
-- landing page reads via the anon client. All writes + admin/
-- invoice/email reads go through the service role (bypasses RLS).
ALTER TABLE fair_itinerary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fair_itinerary: anon read public" ON fair_itinerary;
CREATE POLICY "fair_itinerary: anon read public" ON fair_itinerary
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- No INSERT/UPDATE/DELETE policies: writes are default-denied for
-- anon/authenticated; the service role bypasses RLS.

-- ---------- 4. Seed: August 2026 itinerary --------------------
DO $$
DECLARE v_fair_id UUID;
BEGIN
  SELECT id INTO v_fair_id FROM fairs
  WHERE name LIKE '%August 2026%'
  ORDER BY fair_date DESC LIMIT 1;

  IF v_fair_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM fair_itinerary WHERE fair_id = v_fair_id)
  THEN
    INSERT INTO fair_itinerary
      (fair_id, day_number, event_date, event_type,
       institution_name, venue_name, city,
       start_time, end_time,
       is_main_fair, is_confirmed, is_public, notes, sort_order)
    VALUES
      (v_fair_id, 1, '2026-08-06', 'CAMPUS_VISIT',
       'IIT Gandhinagar', 'Academic Block', 'Gandhinagar',
       '10:00', '13:00', false, true, true,
       'Lunch provided by IAES after the session.', 1),

      (v_fair_id, 2, '2026-08-07', 'CAMPUS_VISIT',
       'Nirma University', 'Conference Centre', 'Ahmedabad',
       '10:00', '13:00', false, false, true,
       NULL, 2),

      (v_fair_id, 3, '2026-08-08', 'OPEN_FAIR',
       NULL, 'Hotel Courtyard by Marriott', 'Ahmedabad',
       '18:00', '21:00', true, true, true,
       'Main open fair. Smart/formal dress recommended.', 3);
  END IF;
END $$;
