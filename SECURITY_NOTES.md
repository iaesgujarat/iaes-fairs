# Security Notes

Deliberate security decisions and their rationale. Read this before
"hardening" something here — the trade-offs were considered.

---

## Portal Gate — Design & Trust Model

The leads portal (`/portal/<registrationId>/students` + its `/csv`) holds
a university's own consent-gated student leads for 30 days.

- **Primary secret:** the unguessable `registrationId` UUID in the URL.
- **Secondary gate:** last 4 digits of the registered phone →
  HMAC-signed, httpOnly, path-scoped cookie (`iaes_portal`, 12h).
  HMAC key = `SUPABASE_SERVICE_ROLE_KEY` (server-only; **rotating that
  key invalidates live gate cookies** — reps just re-enter last-4).
- Admin session bypasses the gate. Fails **closed** if no phone on file.
- Pre-auth screen reveals **university name only** — no registrant
  name/email, so a forwarded link leaks nothing sensitive.

---

## Portal Gate — Rate Limiting

Current: 600ms wrong-attempt penalty only.
Last-4 + UUID combination is sufficient for stated threat model
(casual forwarding). Not brute-force-proof.

Add per-IP rate limiting if:
- Portal is extended beyond 30 days
- Fair scales beyond 100 universities
- Any evidence of scripted attempts in Netlify logs

Suggested implementation when needed:
Upstash Redis, 5 attempts per IP per registration per hour.

### Threat model (why this is acceptable)

| Threat | Defense | Verdict |
| --- | --- | --- |
| Casual link forwarding to unintended recipient | Unguessable UUID (primary) + last-4 PIN (secondary) | ✅ Solved |
| Targeted brute-force by someone who has the URL | 600ms penalty → 10,000 × 0.6s ≈ 100 min minimum, plus UUID obscurity | ✅ Acceptable here (theoretical) |
| Sophisticated scripted attack | None beyond 600ms | ⚠️ Real but irrelevant at this scale |

Context: a 30-day leads portal for ~45 universities. Not a banking
system, not PII of millions — student first names, courses, and
consent-gated contact details. The URL holder is a US university
admissions director protecting their own recruitment leads. Effective
attack surface is ~zero. Revisit only if the conditions above change.
