-- =============================================================
-- IAES Fairs — v23: post-fair university feedback survey.
--
-- When a fair concludes, each confirmed university rep gets a thank-you
-- email with a link to an in-app survey (/survey/<registrationId>). They
-- rate the fair on a few dimensions and leave free-text suggestions.
-- Responses live here, not in a third-party form — viewable + CSV-export
-- from /admin/feedback.
--
-- One response per registration (rep can revisit the link and update) →
-- UNIQUE(registration_id), upserted by the API. fair_id + the name
-- snapshots are denormalised so the admin view / CSV need no joins and
-- survive a later registration edit.
--
-- Purely additive. Idempotent. Apply manually (SQL Editor).
-- RLS on, no public policy → service-role only (server routes).
-- =============================================================

CREATE TABLE IF NOT EXISTS fair_feedback (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id     UUID NOT NULL UNIQUE,
  fair_id             UUID,

  -- Snapshots (denormalised for display/export stability)
  university_name     TEXT,
  contact_name        TEXT,
  fair_name           TEXT,

  -- Ratings (1–5). NULL = not answered.
  overall_rating      SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  leads_rating        SMALLINT CHECK (leads_rating BETWEEN 1 AND 5),
  organization_rating SMALLINT CHECK (organization_rating BETWEEN 1 AND 5),
  recommend_rating    SMALLINT CHECK (recommend_rating BETWEEN 1 AND 5),

  -- Free text
  what_went_well      TEXT,
  what_to_improve     TEXT,
  additional_comments TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fair_feedback_fair_idx
  ON fair_feedback (fair_id);

ALTER TABLE fair_feedback ENABLE ROW LEVEL SECURITY;
