import type { Registration } from "@/types";

/**
 * v19 — flexible invoice recipient.
 *
 * Two billing shapes layer on top of the registrant's own details:
 *
 *   Mode A (university pays directly, USD): an optional "Attn:"
 *     recipient. The legal billed entity STAYS the university
 *     (registration.university_name); this only changes who the
 *     document is addressed to and, if `bill_to_cc`, emailed to.
 *
 *   Mode B (India office pays, INR): a different legal entity in
 *     billing_details. Handled at the billing-details layer, not
 *     here — the only Mode-B helper is `serviceForLine`, which
 *     preserves the "this booth is for [university]" audit link
 *     once the bill is addressed to the India office.
 */

export interface AttnRecipient {
  name: string;
  title: string | null;
  email: string;
}

/**
 * The Mode-A "Attn:" recipient, or null when the registrant did not
 * name someone else. Requires at least a name + email to be useful.
 */
export function getAttnRecipient(reg: Registration): AttnRecipient | null {
  const name = reg.bill_to_attn_name?.trim();
  const email = reg.bill_to_attn_email?.trim();
  if (!name || !email) return null;
  return {
    name,
    title: reg.bill_to_attn_title?.trim() || null,
    email,
  };
}

/**
 * Extra email recipient (CC) for proforma/invoice mailers. Only the
 * Mode-A Attn person, and only when they opted to receive a copy.
 * Returns null (no CC) otherwise. De-dupes against the primary `to`.
 */
export function billingCc(
  reg: Registration,
  primaryTo: string
): string | null {
  const attn = getAttnRecipient(reg);
  if (!attn || !reg.bill_to_cc) return null;
  if (attn.email.toLowerCase() === primaryTo.trim().toLowerCase()) return null;
  return attn.email;
}

/**
 * Mode-B audit line — shown beneath the India-office billed-to block
 * so the document still records which university the booth serves.
 * `null` when there's no separate billed entity (Mode A / default).
 */
export function serviceForLine(
  reg: Registration,
  fairName: string,
  hasBilling: boolean
): string | null {
  if (!hasBilling) return null;
  return `${reg.university_name} — ${fairName}`;
}
