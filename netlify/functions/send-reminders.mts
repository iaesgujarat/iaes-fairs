import type { Config } from "@netlify/functions";

/**
 * Daily — fire any reminder type whose trigger window opened. Logic lives
 * in the Next.js cron endpoint; this scheduled function just pings it.
 *
 * Schedule: daily at 01:00 UTC (06:30 IST) — 30 minutes after the
 * auto-close job so that a fair which closed today still gets its
 * itinerary if it lands in T-28.
 */
export default async () => {
  const base = process.env.URL || process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("send-reminders: missing URL or CRON_SECRET");
    return new Response("missing config", { status: 500 });
  }
  const target = `${base.replace(/\/$/, "")}/api/cron/send-reminders`;
  const res = await fetch(target, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log("send-reminders:", res.status, body);
  return new Response(body, { status: res.status });
};

export const config: Config = {
  schedule: "0 1 * * *",
};
