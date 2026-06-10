# IAES Fairs — Internal Dispute-Handling Playbook

> For the admin team. What to do when a registrant disputes or wants to change
> an invoice, a payment, an amount, or a registration. Based on real cases
> (notably University of Louisville, June 2026). Last updated 2026-06-10.

## Golden rules

1. **Never use "Edit details" to fix a billing question.** Edit details
   changes the *registrant's identity/contact*. If someone asks for the
   invoice to be addressed to a director, an approver, or a finance office,
   that is a **billing-recipient** change — use the *Billing & invoice
   recipient* card. (Louisville lesson: the rep's contact was overwritten with
   the director's and had to be restored.)
2. **The registrant stays the registrant.** A person named for invoice
   purposes becomes an **"Attn:"** line (USD) or a **billed legal entity**
   (INR India-office), never a replacement of the rep.
3. **Billing details lock only on real payment.** "Real payment" means a TAX
   invoice with status `paid` exists — not a soft confirm, not a bare
   `confirmed` status. Until money is received, billing recipient changes are
   allowed and normal.
4. **Document everything in the system.** Make changes through the admin
   panel (they're recorded), resend documents through "Save & resend" (CC'd,
   logged in Resend with the PDF attached). Avoid side-channel promises by
   personal email or WhatsApp that the system doesn't know about.
5. **Money-adjacent changes get a second pair of eyes** before sending
   anything external (see Escalation).

## Playbooks by dispute type

### A. "Please address the invoice to someone else" (USD university)

The most common request — a rep wants the proforma/invoice addressed to their
director or approver.

1. Open the registration → **Billing & invoice recipient** card.
2. Keep mode = university (USD). Fill **Attn: name / title / email**; add the
   approver's email as **CC** if they should receive the documents too.
3. **Save & resend email** — one email goes To the rep, CC the Attn person,
   with the re-rendered PDF attached.
4. Do **not** touch Edit details. The rep remains the registrant.

*Worked example (resolved 2026-06-05):* U Louisville — rep Rutuja Vaidya
restored as registrant; proforma PI-2026-95EG re-issued with
"Attn: Jillian Misbach (Director)"; single email To rep, CC director,
delivery confirmed in Resend.

### B. "A third party in India pays for us" (INR)

1. Billing card → mode = **India office**. Enter the Indian entity's legal
   name, GSTIN and state (drives IGST vs CGST+SGST), plus an
   **authorization note** recording why the third party is billed.
2. The invoice flips to INR with GST; the document carries a
   "Service rendered for: [university] — [fair]" line.
3. Direct university payment is always USD — if the payer is in India, it is
   always Mode B.

### C. "The amount is wrong" / negotiated amount / short receipt

- Pricing disagreements **before payment**: agree the figure with the
  registrant first (escalate per below), then proceed — do not edit minted
  documents.
- At manual confirmation, **the tax invoice is built from the amount actually
  received** ("Mark as paid" modal): USD amount as-is; INR totals have GST
  backed out (×18/118). A negotiated flat rate is therefore handled naturally
  at confirm time.
- If the bank credit differs from the billed amount (forex/bank charges),
  record the **actual credited INR** in the modal — billed vs realised are
  stored separately by design; small differences are not a dispute.

### D. "We paid but you show unpaid"

1. Ask for the remittance advice / UTR and date.
2. Verify against the bank account. If found: **Mark as paid** with the real
   bank-credit date, UTR and credited amount → tax invoice + confirmation
   email/WhatsApp (with itinerary) fire automatically.
3. If not found within 2 business days of their claimed date, reply with our
   bank details and ask their bank to trace the transfer. Keep status
   `soft_confirmed` meanwhile so their spot is held.

### E. Cancellation / refund request

1. **Unpaid** registration: registration → Danger zone → **Cancel** (soft).
   Status becomes `cancelled`, unpaid invoices are voided, and the email is
   freed so they can re-register later. Hard delete is reserved for
   junk/duplicate rows and is blocked once any successful payment exists.
2. **Paid** registration: do **not** cancel unilaterally. Escalate — refunds
   are a management decision (amount, deduction, timing). Once decided,
   process the refund by bank transfer, record it against the payment, and
   only then cancel the registration.

### F. Duplicate registration

Per-fair dedupe blocks the same email registering twice for one fair, but a
university may still register twice via different emails/reps. Keep the
registration that matches reality, soft-cancel the other, and tell the rep
which reference number survives.

### G. Card/gateway chargeback (once Razorpay is live)

When the gateway is on, a cardholder can dispute through their bank. Respond
inside Razorpay's deadline with the evidence pack:

- registration record (timestamped, with the registrant's details),
- proforma + tax invoice PDFs,
- Resend delivery logs of every email (documents were attached),
- WhatsApp send log if applicable,
- the fair's public terms accepted at registration.

Never refund outside the chargeback process while a chargeback is open
(double-loss risk).

## Escalation & decision rights

| Decision | Who decides |
| --- | --- |
| Attn/CC changes, resends, soft confirm | Any admin, self-serve |
| Mode A ↔ Mode B switch (currency/GST changes) | Admin, but flag to management same-day |
| Negotiated pricing, refunds, paid-registration cancellation | Management only |
| Hard delete of a registration | Management only, and never if a payment exists |

## After every dispute

- Confirm the resolution to the registrant in writing **through the system**
  (resend with the corrected document attached).
- If the dispute exposed a process gap, note it — the Louisville case is the
  template: it produced the billing-lock fix, the soft/hard-confirm split and
  this playbook.
