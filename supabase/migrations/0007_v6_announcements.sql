-- =============================================================
-- IAES Fairs — v6 (Slice C): Announcements + Reminders
--   * announcement_recipients — global mailing list (one row per
--     unique email)
--   * announcement_sends — per-(fair, recipient, email_type)
--     audit trail; UNIQUE prevents duplicate sends
-- =============================================================

-- ---------- 1. Mailing list -------------------------------------
CREATE TABLE IF NOT EXISTS announcement_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  organization TEXT,
  source TEXT NOT NULL DEFAULT 'MANUAL'
    CHECK (source IN (
      'PAST_PARTICIPANT',
      'MANUAL',
      'CSV_UPLOAD',
      'NEWSLETTER'
    )),
  is_active BOOLEAN NOT NULL DEFAULT true,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_announcement_recipients_active
  ON announcement_recipients(is_active);
CREATE INDEX IF NOT EXISTS idx_announcement_recipients_source
  ON announcement_recipients(source);

ALTER TABLE announcement_recipients ENABLE ROW LEVEL SECURITY;
-- All reads/writes through service role.

-- ---------- 2. Per-fair per-recipient send log -----------------
CREATE TABLE IF NOT EXISTS announcement_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fair_id UUID REFERENCES fairs(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES announcement_recipients(id) ON DELETE CASCADE NOT NULL,
  email_type TEXT NOT NULL
    CHECK (email_type IN (
      'ANNOUNCEMENT',
      'EARLYBIRD_REMINDER',
      'REGISTRATION_REMINDER',
      'ITINERARY',
      'PAYMENT_REMINDER',
      'POSTFAIR_DATA',
      'CANCELLATION'
    )),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  resend_email_id TEXT,
  UNIQUE(fair_id, recipient_id, email_type)
);

CREATE INDEX IF NOT EXISTS idx_announcement_sends_fair
  ON announcement_sends(fair_id);
CREATE INDEX IF NOT EXISTS idx_announcement_sends_recipient
  ON announcement_sends(recipient_id);

ALTER TABLE announcement_sends ENABLE ROW LEVEL SECURITY;
