import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Door staff enters the PIN on /checkin once. The page POSTs here to
 * verify before storing the PIN in localStorage. We don't return the
 * server PIN — only ok / not ok.
 */
export async function POST(req: Request) {
  const expected = process.env.CHECKIN_PIN;
  if (!expected) {
    return NextResponse.json(
      { error: "Check-in is not configured (no CHECKIN_PIN set)." },
      { status: 503 }
    );
  }
  let body: { pin?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* default */
  }
  if (!body.pin || body.pin !== expected) {
    return NextResponse.json(
      { error: "Incorrect PIN." },
      { status: 401 }
    );
  }
  return NextResponse.json({ ok: true });
}
