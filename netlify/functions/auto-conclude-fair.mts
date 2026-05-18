import type { Config } from "@netlify/functions";

/**
 * Daily at 18:30 UTC = 00:00 IST. Concludes any ONGOING fair whose end
 * date has passed (IST): caches stats, flips status → COMPLETED, sends
 * thank-you emails. Logic lives in the Next.js cron endpoint; this
 * scheduled function just pings it. Manual conclude stays as override.
 */
export default async () => {
  const base = process.env.URL || process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("auto-conclude-fair: missing URL or CRON_SECRET");
    return new Response("missing config", { status: 500 });
  }
  const target = `${base.replace(/\/$/, "")}/api/cron/auto-conclude-fair`;
  const res = await fetch(target, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log("auto-conclude-fair:", res.status, body);
  return new Response(body, { status: res.status });
};

export const config: Config = {
  schedule: "30 18 * * *",
};
