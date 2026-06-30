/// <reference lib="webworker" />

// v17 Phase 1 — Serwist service worker.
//
// THE ONE RULE THIS FILE EXISTS TO ENFORCE:
//   NEVER cache /api, /admin, /auth, /payment, /invoice, /confirmation,
//   /portal, /survey, /scan, /checkin. Stale data on those paths means money
//   disputes, leaked auth state, or fake "checked-in" / "paid" UI.
//
// Everything else is conservatively cached:
//   - HTML navigations: NetworkFirst (3s timeout → cache fallback)
//   - Hashed static (/_next/static, /icons, /favicon.ico): CacheFirst
//   - /_next/image: StaleWhileRevalidate
//   - Google Fonts: CacheFirst
//
// SW is disabled in development (handled by next.config.mjs).

import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
} from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

// ── NEVER-CACHE — financial / auth / live-data routes ─────────────
// If you're unsure about a new route, add it here. Stale here = bug.
const NEVER_CACHE: RegExp[] = [
  /^\/api\//,
  /^\/admin(\/|$)/,
  /^\/auth\//,
  /^\/payment\//,
  /^\/invoice\//,
  /^\/confirmation\//,
  /^\/portal\//,
  /^\/survey(\/|$)/,
  /^\/scan(\/|$)/,
  /^\/checkin(\/|$)/,
];

function isNeverCache(url: URL): boolean {
  return NEVER_CACHE.some((re) => re.test(url.pathname));
}

const serwist = new Serwist({
  // Precache the app shell at install time (JS chunks, CSS, fonts).
  precacheEntries: self.__SW_MANIFEST,

  // /offline is the fallback only for navigations to the allowlist
  // below. Admin / payment / invoice etc. are deliberately NOT in
  // the allowlist — they fail hard offline, which is correct.
  precacheOptions: {
    navigateFallback: "/offline",
    navigateFallbackAllowlist: [
      /^\/$/,
      /^\/fair\//,
      /^\/register\/(university|institution|campus-host)(\/.*)?$/,
      /^\/student$/,
      /^\/pass\//,
      /^\/terms$/,
      /^\/offline$/,
    ],
  },

  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,

  runtimeCaching: [
    // 1. NEVER-CACHE — NetworkOnly. Request fails naturally offline.
    {
      matcher: ({ url }) => isNeverCache(url),
      handler: new NetworkOnly(),
    },

    // 2. HTML page navigations — NetworkFirst (3s timeout → cache).
    //    Excludes never-cache routes (handled above) because matchers
    //    are evaluated in order.
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages-cache",
        networkTimeoutSeconds: 3,
      }),
    },

    // 3. Hashed static assets — CacheFirst (versioned by build hash).
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin &&
        (url.pathname.startsWith("/_next/static/") ||
          url.pathname.startsWith("/icons/") ||
          url.pathname === "/favicon.ico" ||
          url.pathname === "/icon.png" ||
          url.pathname === "/apple-icon.png"),
      handler: new CacheFirst({ cacheName: "static-assets" }),
    },

    // 4. Next.js image optimisation — StaleWhileRevalidate.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/_next/image"),
      handler: new StaleWhileRevalidate({ cacheName: "next-image-cache" }),
    },

    // 5. Google Fonts — CacheFirst (effectively immutable at the URL).
    {
      matcher: ({ url }) =>
        url.origin === "https://fonts.googleapis.com" ||
        url.origin === "https://fonts.gstatic.com",
      handler: new CacheFirst({ cacheName: "google-fonts" }),
    },
  ],
});

serwist.addEventListeners();
