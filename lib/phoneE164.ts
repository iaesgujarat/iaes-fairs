// E.164 phone normalization. Pragmatic, dependency-free, FAIL-SOFT:
// returns null when a number can't be resolved safely rather than
// guessing a country code. A null just means "don't WhatsApp this one" —
// the email path is unaffected.
//
// Why this exists: WhatsApp's Cloud API requires full international
// numbers (E.164 = +<country><national>, 8–15 digits). Our registration
// forms collect phones loosely (students/institutions only enforce "min
// 6 chars"), so many rows arrive with no country code. We only prefix a
// country code when we can do so safely:
//   - the number already starts with "+" or "00" -> trust what was typed
//   - a bare national number -> resolve ONLY with an explicit defaultCc
//
// defaultCc is an audience hint the CALLER controls: students and
// campus-host institutions are India-based, so those routes pass "IN".
// International university reps get no default -> a bare number returns
// null (we simply don't WhatsApp them; their email still goes out).

const CC_DIAL: Record<string, string> = {
  IN: "91",
};

function isValidE164Digits(d: string): boolean {
  return d.length >= 8 && d.length <= 15;
}

/**
 * Normalize a raw phone string to E.164 (e.g. "+919898123210"), or null
 * if it can't be resolved safely. Never throws.
 */
export function toE164(
  raw: string | null | undefined,
  defaultCc?: string
): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;

  // International access prefix "00" -> "+"
  if (s.startsWith("00")) s = "+" + s.slice(2);

  const hadPlus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  if (!digits) return null;

  if (hadPlus) {
    // Trust the country code the user explicitly typed.
    return isValidE164Digits(digits) ? "+" + digits : null;
  }

  // No country code present — only resolvable with a default hint.
  const cc = defaultCc ? CC_DIAL[defaultCc] : undefined;
  if (!cc) return null;

  if (cc === "91") {
    // India: 10-digit mobile starting 6–9, optionally with a leading 0
    // or an already-present 91 prefix.
    let nat = digits;
    if (nat.length === 11 && nat.startsWith("0")) nat = nat.slice(1);
    if (nat.length === 12 && nat.startsWith("91")) nat = nat.slice(2);
    if (nat.length === 10 && /^[6-9]/.test(nat)) return "+91" + nat;
    return null;
  }

  const candidate = cc + digits;
  return isValidE164Digits(candidate) ? "+" + candidate : null;
}

/** Mask for logs: +919898****210 — never log full numbers. */
export function maskPhone(e164: string): string {
  if (e164.length <= 8) return e164;
  return e164.slice(0, 6) + "****" + e164.slice(-3);
}
