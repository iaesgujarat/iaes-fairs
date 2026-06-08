// Country dial codes for the registration phone picker. Kept small and
// curated (IAES's real source markets + the major senders) rather than an
// exhaustive ISO table — enough that any rep can find their country, with
// India + the form's university countries first.

export interface DialCode {
  iso: string;
  name: string;
  dial: string;
}

export const DIAL_CODES: DialCode[] = [
  { iso: "US", name: "United States", dial: "1" },
  { iso: "CA", name: "Canada", dial: "1" },
  { iso: "GB", name: "United Kingdom", dial: "44" },
  { iso: "IN", name: "India", dial: "91" },
  { iso: "AU", name: "Australia", dial: "61" },
  { iso: "NZ", name: "New Zealand", dial: "64" },
  { iso: "IE", name: "Ireland", dial: "353" },
  { iso: "DE", name: "Germany", dial: "49" },
  { iso: "FR", name: "France", dial: "33" },
  { iso: "NL", name: "Netherlands", dial: "31" },
  { iso: "IT", name: "Italy", dial: "39" },
  { iso: "ES", name: "Spain", dial: "34" },
  { iso: "SE", name: "Sweden", dial: "46" },
  { iso: "CH", name: "Switzerland", dial: "41" },
  { iso: "AE", name: "United Arab Emirates", dial: "971" },
  { iso: "SA", name: "Saudi Arabia", dial: "966" },
  { iso: "QA", name: "Qatar", dial: "974" },
  { iso: "KW", name: "Kuwait", dial: "965" },
  { iso: "OM", name: "Oman", dial: "968" },
  { iso: "SG", name: "Singapore", dial: "65" },
  { iso: "MY", name: "Malaysia", dial: "60" },
  { iso: "CN", name: "China", dial: "86" },
  { iso: "HK", name: "Hong Kong", dial: "852" },
  { iso: "JP", name: "Japan", dial: "81" },
  { iso: "KR", name: "South Korea", dial: "82" },
  { iso: "PH", name: "Philippines", dial: "63" },
  { iso: "ID", name: "Indonesia", dial: "62" },
  { iso: "VN", name: "Vietnam", dial: "84" },
  { iso: "TH", name: "Thailand", dial: "66" },
  { iso: "BD", name: "Bangladesh", dial: "880" },
  { iso: "LK", name: "Sri Lanka", dial: "94" },
  { iso: "NP", name: "Nepal", dial: "977" },
  { iso: "PK", name: "Pakistan", dial: "92" },
  { iso: "ZA", name: "South Africa", dial: "27" },
  { iso: "NG", name: "Nigeria", dial: "234" },
  { iso: "KE", name: "Kenya", dial: "254" },
  { iso: "EG", name: "Egypt", dial: "20" },
  { iso: "BR", name: "Brazil", dial: "55" },
  { iso: "MX", name: "Mexico", dial: "52" },
  { iso: "TR", name: "Turkey", dial: "90" },
  { iso: "MU", name: "Mauritius", dial: "230" },
];

export function dialForIso(iso: string): string {
  return DIAL_CODES.find((d) => d.iso === iso)?.dial ?? "1";
}

/**
 * Map the registration form's coarse country values (USA/Canada/UK/Other)
 * to a default ISO for the dial-code picker. "Other" — and any unknown —
 * defaults to India, since for this India-based org a bare contact number
 * is overwhelmingly Indian. The rep can always change the picker.
 */
export function isoForUniversityCountry(
  country: string | undefined | null
): string {
  switch ((country || "").trim().toUpperCase()) {
    case "USA":
    case "UNITED STATES":
      return "US";
    case "CANADA":
      return "CA";
    case "UK":
    case "UNITED KINGDOM":
      return "GB";
    default:
      return "IN";
  }
}

/** Strip a national number to bare digits, dropping trunk leading zeros. */
export function toNationalDigits(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+/, "");
}

/**
 * Combine a selected dial code + the national number field into E.164.
 * If the number field itself holds a full international value (starts with
 * "+" or "00"), that is honored and the dial code is ignored — so a pasted
 * "+1 202…" is never double-prefixed. Returns "" when empty/invalid.
 */
export function buildE164(dial: string, rawNational: string): string {
  const s = rawNational.trim();
  if (s.startsWith("+") || s.startsWith("00")) {
    const digits = s.replace(/^00/, "").replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15 ? "+" + digits : "";
  }
  const nat = toNationalDigits(s);
  if (!nat) return "";
  return "+" + dial + nat;
}
