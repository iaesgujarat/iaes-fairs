import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PORTAL_COOKIE,
  PORTAL_MAX_AGE,
  portalToken,
  portalCookiePath,
  phoneLast4,
} from "@/lib/portalAccess";

export const runtime = "nodejs";

/**
 * Gate check for the leads portal. Body: { last4 }. Compares against
 * the registration's contact_phone (digits only). On success sets the
 * signed, path-scoped access cookie. Fails closed if no phone on file.
 */
export async function POST(
  req: Request,
  { params }: { params: { registrationId: string } }
) {
  let body: { last4?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const last4 = (body.last4 ?? "").replace(/\D/g, "");
  if (last4.length !== 4) {
    return NextResponse.json(
      { error: "Enter the last 4 digits of your registered phone." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select("id, contact_phone")
    .eq("id", params.registrationId)
    .maybeSingle();
  if (!reg) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const expected = phoneLast4(
    (reg as { contact_phone: string | null }).contact_phone
  );
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "No phone on file for this registration. Email eduadviser@iaesgujarat.org for access.",
      },
      { status: 422 }
    );
  }

  if (last4 !== expected) {
    // Light friction against scripted guessing of the 10k space. Not a
    // substitute for real rate limiting (tracked as a follow-up).
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json(
      { error: "Incorrect. Check the last 4 digits of the registered phone." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(PORTAL_COOKIE, portalToken(params.registrationId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: portalCookiePath(params.registrationId),
    maxAge: PORTAL_MAX_AGE,
  });
  return res;
}
