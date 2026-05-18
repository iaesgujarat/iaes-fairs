import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { assertAdmin } from "@/lib/admin";

// Lightweight gate for the leads portal. The unguessable registrationId
// in the URL is the primary secret; this adds a "last 4 digits of the
// registered phone" challenge so a casually-forwarded link doesn't
// expose all leads. On success we set an HMAC-signed, path-scoped
// cookie so the rep isn't re-challenged on every page / CSV download.
//
// HMAC key = SUPABASE_SERVICE_ROLE_KEY (already a server-only secret,
// never shipped to the client) — avoids a new env var that could be
// unset in prod and silently break the gate.

export const PORTAL_COOKIE = "iaes_portal";
export const PORTAL_MAX_AGE = 12 * 60 * 60; // 12h — covers a fair day

function secret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("portal gate: SUPABASE_SERVICE_ROLE_KEY unset");
  return s;
}

export function portalToken(registrationId: string): string {
  return createHmac("sha256", secret())
    .update(`portal:${registrationId}`)
    .digest("hex");
}

export function verifyPortalToken(
  registrationId: string,
  token: string | undefined | null
): boolean {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(portalToken(registrationId));
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Cookie is scoped to this registration's portal path only. */
export function portalCookiePath(registrationId: string): string {
  return `/portal/${registrationId}`;
}

/** Digits-only last 4 of a phone, or null if it has < 4 digits. */
export function phoneLast4(
  phone: string | null | undefined
): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : null;
}

/**
 * Server-side access check. An authenticated admin always passes
 * (IAES staff shouldn't be challenged); otherwise a valid signed
 * cookie for THIS registration is required. Fails closed.
 */
export async function hasPortalAccess(
  registrationId: string
): Promise<boolean> {
  try {
    const admin = await assertAdmin();
    if (admin) return true;
  } catch {
    /* no admin session — fall through to cookie check */
  }
  const token = cookies().get(PORTAL_COOKIE)?.value;
  return verifyPortalToken(registrationId, token);
}
