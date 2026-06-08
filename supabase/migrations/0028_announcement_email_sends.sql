-- =============================================================
-- IAES Fairs — v21 Phase B: email-broadcast dedupe log.
--
-- Records which subscriber emails have already received the
-- announcement for a given fair, so re-running the broadcast (or a
-- second admin click) never double-emails. WhatsApp dedupe already
-- uses whatsapp_sends + alreadySentWhatsApp(); this is the email
-- equivalent for announcement_leads.
--
-- Purely additive. Idempotent. Apply manually (SQL Editor).
-- RLS on, no public policy → service-role only.
-- =============================================================

CREATE TABLE IF NOT EXISTS announcement_email_sends (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fair_id   UUID NOT NULL REFERENCES fairs(id) ON DELETE CASCADE,
  email     TEXT NOT NULL,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fair_id, email)
);

CREATE INDEX IF NOT EXISTS announcement_email_sends_fair_idx
  ON announcement_email_sends (fair_id);

ALTER TABLE announcement_email_sends ENABLE ROW LEVEL SECURITY;
