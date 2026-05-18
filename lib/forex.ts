export interface ForexRate {
  rate: number; // 1 USD = `rate` INR
  date: string; // YYYY-MM-DD
  /** Provenance for the invoice / GST audit trail. */
  source: string;
  /** HH:MM (IST) the rate was captured — shown on the invoice. */
  time: string;
}

const FOREX_URL = "https://api.exchangerate-api.com/v4/latest/USD";
const FALLBACK_RATE = 83.5;

const SOURCE_LIVE = "Market reference rate (exchangerate-api.com)";
const SOURCE_FALLBACK = "System fallback rate (live source unavailable)";

/** Current time as HH:MM in IST, e.g. "01:30 PM". */
function istTime(): string {
  return new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Fetch the live USD→INR rate. Falls back to a safe constant if the API
 * is unreachable so the registration flow never blocks on forex outage.
 *
 * The returned rate is intended to be **locked into the invoice row**
 * (`forex_rate_used` + `forex_rate_date` + `forex_rate_source` +
 * `forex_rate_time`) — never recompute later.
 */
export async function getLiveForexRate(): Promise<ForexRate> {
  const date = new Date().toISOString().slice(0, 10);
  const time = istTime();
  try {
    const res = await fetch(FOREX_URL, {
      next: { revalidate: 3600 }, // 1h cache when fetched inside a route
    });
    if (!res.ok) throw new Error(`forex http ${res.status}`);
    const data = (await res.json()) as { rates?: { INR?: number } };
    const inr = data.rates?.INR;
    if (typeof inr !== "number" || !isFinite(inr) || inr <= 0) {
      throw new Error("forex: invalid INR rate");
    }
    return {
      rate: Math.round(inr * 10000) / 10000, // 4-dp precision matches DB column
      date,
      source: SOURCE_LIVE,
      time,
    };
  } catch (e) {
    console.error("Forex fetch failed, using fallback:", e);
    return {
      rate: FALLBACK_RATE,
      date,
      source: SOURCE_FALLBACK,
      time,
    };
  }
}
