import type { Config } from "@netlify/functions";

/**
 * Daily check: any PUBLISHED fair whose registration_deadline has
 * passed gets auto-closed. The actual logic lives in the Next.js
 * API route — this scheduled function just pings it with the
 * CRON_SECRET so external callers can't forge a transition.
 *
 * Schedule: daily at 00:30 UTC (06:00 IST).
 */
export default async () => {
  const base = process.env.URL || process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("auto-close-registration: missing URL or CRON_SECRET");
    return new Response("missing config", { status: 500 });
  }
  const target = `${base.replace(/\/$/, "")}/api/cron/auto-close-registration`;
  const res = await fetch(target, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log("auto-close-registration:", res.status, body);
  return new Response(body, { status: res.status });
};

export const config: Config = {
  schedule: "30 0 * * *",
};
