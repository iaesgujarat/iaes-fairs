-- =============================================================
-- IAES Fairs — v20: WhatsApp channel (foundation).
--
-- Adds the WhatsApp notification channel ALONGSIDE email (never a
-- replacement). Three audiences — university registrants, campus-host
-- institutions, and students — opt in during registration; their
-- consented number then lives in a PERSISTENT contact registry so they
-- are reachable for FUTURE fairs, not just the one they signed up for.
--
-- Tables:
--   whatsapp_contacts  — cross-fair registry (the WhatsApp analog of
--                        announcement_recipients). One row per number;
--                        honours STOP/unsubscribe via is_active.
--   whatsapp_sends     — per-message send log (audit + delivery status
--                        from Meta webhooks). NOT uniquely constrained:
--                        transactional resends are allowed; broadcast
--                        dedupe is done in application code (mirrors the
--                        announcement_sends select-before-send pattern).
--   whatsapp_inbound   — raw webhook payloads (status callbacks + user
--                        replies). Drives STOP handling + delivery state.
--
-- registrations gains whatsapp_consent + whatsapp_phone_e164 (students
-- and institutions already carry whatsapp_consent).
--
-- Purely additive. Idempotent. Apply manually (SQL Editor).
-- RLS enabled with NO public policy -> service-role only (these tables
-- are only ever touched by server routes using the service key).
-- =============================================================

-- ---- University registrant opt-in + normalized number -------
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS whatsapp_consent    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_phone_e164 TEXT;

-- ---- Persistent cross-fair contact registry -----------------
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164      TEXT NOT NULL UNIQUE,
  name            TEXT,
  audience        TEXT NOT NULL
                    CHECK (audience IN ('university','institution','student','admin')),
  country         TEXT,
  source_fair_id  UUID REFERENCES fairs(id) ON DELETE SET NULL,
  consent         BOOLEAN NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_contacts_active_idx
  ON whatsapp_contacts (is_active, audience);

-- ---- Per-message send log -----------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_sends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fair_id         UUID REFERENCES fairs(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  template_name   TEXT NOT NULL,
  context         TEXT,
  wa_message_id   TEXT,
  status          TEXT NOT NULL DEFAULT 'queued',
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_sends_lookup_idx
  ON whatsapp_sends (fair_id, recipient_phone, template_name);
CREATE INDEX IF NOT EXISTS whatsapp_sends_msgid_idx
  ON whatsapp_sends (wa_message_id);

-- ---- Raw inbound webhook payloads ---------------------------
CREATE TABLE IF NOT EXISTS whatsapp_inbound (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_message_id TEXT,
  from_phone    TEXT,
  kind          TEXT,            -- 'status' | 'message'
  status        TEXT,            -- delivered | read | failed (status kind)
  body          TEXT,            -- text of an inbound user reply
  raw           JSONB,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_inbound_from_idx
  ON whatsapp_inbound (from_phone);

-- ---- RLS: service-role only (no public policy) --------------
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sends    ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_inbound  ENABLE ROW LEVEL SECURITY;
