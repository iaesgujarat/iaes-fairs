-- =============================================================
-- IAES Fairs — v19: flexible invoice recipient.
--
-- Two real-world billing shapes that the registrant's own name
-- does not capture:
--
--   Mode A (university pays directly, USD / export of service):
--     the proforma/invoice should be ADDRESSED to a different
--     person at the university (e.g. the finance office or a
--     dean), while the legal billed entity STAYS the university.
--     -> bill_to_attn_* hold the "Attn:" recipient; bill_to_cc
--        flags whether they should also receive the email copy.
--
--   Mode B (an India-based office handles payment, INR / IGST):
--     a different Indian legal entity (e.g. Sannam S4 India Pvt
--     Ltd, appointed by the university) is the actual customer.
--     This already flows through billing_details (legal_name,
--     state -> IGST). authorization_note records WHY we billed a
--     third party — the university's written instruction — for an
--     audit trail when the redirect is set later by admin.
--
-- Purely additive. Idempotent. Apply manually (SQL Editor).
-- Safe pre-migration: every read site treats these as optional.
-- =============================================================

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS bill_to_attn_name  TEXT,
  ADD COLUMN IF NOT EXISTS bill_to_attn_title TEXT,
  ADD COLUMN IF NOT EXISTS bill_to_attn_email TEXT,
  ADD COLUMN IF NOT EXISTS bill_to_cc         BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE billing_details
  ADD COLUMN IF NOT EXISTS authorization_note TEXT;
