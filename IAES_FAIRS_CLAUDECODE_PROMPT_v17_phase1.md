# IAES Fairs — Claude Code Prompt v17 Phase 1
# Installable PWA Shell — whole platform
# ─────────────────────────────────────────
# Build AFTER: Supabase Custom SMTP, V14 self-test, fair-assets check
# Independent of v16 — can be built in parallel or before.
# Touches: manifest, icons, service worker, one offline page.
# Does NOT touch: any route, any component, any API, any DB.

---

## WHAT THIS PHASE DOES

1. `app/manifest.ts` — Web App Manifest (name, icons, theme, display)
2. `public/icons/` — PWA icon set from IAES logo
3. Service worker via Serwist — conservative caching rules:
   - App shell + static assets: cached (fast loads)
   - /api/*, /admin/*, /auth/*, payment, invoice: NEVER cached
   - Navigations: network-first (always fresh page data)
4. `app/offline/page.tsx` — offline fallback page
5. Install hint component for reps and students

---

## THE ONE RULE THAT MUST NEVER BREAK

```
NEVER cache:
  /api/*           ← live data (slots, payments, scans)
  /admin/*         ← financial data, stale = misleading
  /auth/*          ← authentication
  /payment/*       ← Razorpay, must be live
  /invoice/*       ← tax documents, must be live
  /confirmation/*  ← payment status, must be live
  /scan/*          ← live student profiles (P3 handles offline)
  /portal/*        ← lead data, must be live

SAFE to cache:
  App shell (JS, CSS, fonts)
  Static assets (images, icons)
  /offline          ← the fallback page itself
```

Violating this rule serves stale financial data.
Every caching decision must pass this test before being added.

---

## 1. INSTALL DEPENDENCY

```bash
npm install serwist @serwist/next
```

Serwist is the maintained fork of next-pwa/Workbox.
It has first-class Next.js App Router support.

---

## 2. `next.config.ts` — Wrap with Serwist

```typescript
// next.config.ts  — full replacement

import type { NextConfig } from 'next';
import withSerwist from '@serwist/next';

const nextConfig: NextConfig = {
  // ... keep all existing config options unchanged ...
};

const withPWA = withSerwist({
  swSrc:  'app/sw.ts',      // our service worker source
  swDest: 'public/sw.js',   // output (must be in public/)
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  // Disable SW in dev — avoids caching confusion while coding
});

export default withPWA(nextConfig);
```

---

## 3. `app/manifest.ts` — Web App Manifest

```typescript
// app/manifest.ts

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'IAES Education Fairs',
    short_name:       'IAES Fairs',
    description:
      'IAES U.S. University Education Outreach Tour & Fair — ' +
      'Ahmedabad, Gujarat',
    start_url:        '/',
    display:          'standalone',
    orientation:      'portrait',
    background_color: '#ffffff',
    theme_color:      '#0B2B5C',
    categories:       ['education', 'business'],
    lang:             'en',
    icons: [
      {
        src:     '/icons/icon-192.png',
        sizes:   '192x192',
        type:    'image/png',
        purpose: 'maskable',
      },
      {
        src:     '/icons/icon-512.png',
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     '/icons/icon-512-maskable.png',
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name:      'Scan Student Pass',
        short_name: 'Scanner',
        url:       '/scan',
        icons:     [{ src: '/icons/icon-96.png', sizes: '96x96' }],
      },
      {
        name:      'My Student Pass',
        short_name: 'My Pass',
        url:       '/student',
        icons:     [{ src: '/icons/icon-96.png', sizes: '96x96' }],
      },
    ],
  };
}
```

---

## 4. ICONS — Generate from IAES Logo

### What to generate

Create these files in `public/icons/`:

```
public/icons/
├── icon-96.png         96×96    (shortcut icons)
├── icon-192.png        192×192  (home screen, maskable)
├── icon-512.png        512×512  (splash screen, any)
├── icon-512-maskable.png 512×512 (maskable — safe zone logo)
├── apple-touch-icon.png  180×180 (iOS Safari bookmark)
└── favicon.ico            32×32  (browser tab)
```

### Maskable vs Any
- `any`: logo fills the entire 512×512 — used as-is
- `maskable`: logo centred in the inner 80% safe zone
  with navy (#0B2B5C) background filling the rest —
  Android clips icons to shapes (circle, squircle etc.)
  and this prevents logo from being cut off

### Generation method
Use sharp (already likely in deps) or a PWA icon generator:

```bash
npx @vite-pwa/assets-generator --preset minimal \
  public/icons/source.png
```

OR manually resize the existing IAES logo SVG/PNG using
any image editor. The key sizes are 192 and 512.

---

## 5. `app/sw.ts` — Service Worker

```typescript
// app/sw.ts

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import {
  Serwist,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
  CacheFirst,
} from 'serwist';

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[];
  }
}

declare const self: ServiceWorkerGlobalScope;

// ── NEVER-CACHE PATTERNS ─────────────────────────────────────
// These routes are financial / auth / live-data.
// Serving stale data here causes money disputes or security issues.
const NEVER_CACHE = [
  /^\/api\//,          // all API routes
  /^\/admin\//,        // admin dashboard + all sub-routes
  /^\/auth\//,         // Supabase auth callback
  /^\/payment\//,      // Razorpay payment pages
  /^\/invoice\//,      // tax invoices
  /^\/confirmation\//,  // payment confirmations
  /^\/portal\//,       // lead data portal
  /^\/scan\//,         // student scan profiles (P3 handles this)
];

function isNeverCache(url: URL): boolean {
  return NEVER_CACHE.some(pattern => pattern.test(url.pathname));
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Precaches the app shell (JS chunks, CSS, fonts) at install time
  // so the skeleton of the app loads instantly on repeat visits.

  precacheOptions: {
    navigateFallback:          '/offline',
    navigateFallbackAllowlist: [
      // Only these routes fall back to /offline when network fails.
      // Everything else (api, admin, payment) fails naturally.
      /^\/$/,
      /^\/fair\//,
      /^\/register\//,
      /^\/student$/,
      /^\/pass\//,
      /^\/terms$/,
    ],
  },

  skipWaiting:     true,
  clientsClaim:    true,
  navigationPreload: true,

  runtimeCaching: [

    // ── 1. NEVER-CACHE ROUTES → NetworkOnly ──────────────────
    // Financial / auth / live data: always hit the network.
    // If offline → request fails naturally (no stale data served).
    {
      matcher: ({ url }) => isNeverCache(url),
      handler: new NetworkOnly(),
    },

    // ── 2. NAVIGATIONS (HTML pages) → NetworkFirst ───────────
    // Always try network first. Falls back to /offline only for
    // routes in the navigateFallbackAllowlist above.
    // Admin + payment pages are excluded from the allowlist —
    // they fail hard offline, which is correct behaviour.
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName:        'pages-cache',
        networkTimeoutSeconds: 3,
        plugins: [],
      }),
    },

    // ── 3. STATIC ASSETS → CacheFirst ────────────────────────
    // JS, CSS, images, fonts — versioned by Next.js build hash.
    // Safe to cache aggressively: they change with each deploy.
    {
      matcher: ({ url }) =>
        url.pathname.startsWith('/_next/static/') ||
        url.pathname.startsWith('/icons/') ||
        url.pathname === '/favicon.ico',
      handler: new CacheFirst({
        cacheName: 'static-assets',
        plugins:   [],
      }),
    },

    // ── 4. NEXT.JS IMAGE OPTIMISATION → StaleWhileRevalidate ─
    // Images from /_next/image — fresh in background.
    {
      matcher: ({ url }) => url.pathname.startsWith('/_next/image'),
      handler: new StaleWhileRevalidate({
        cacheName: 'next-image-cache',
        plugins:   [],
      }),
    },

    // ── 5. FONTS → CacheFirst ────────────────────────────────
    {
      matcher: ({ url }) =>
        url.origin === 'https://fonts.googleapis.com' ||
        url.origin === 'https://fonts.gstatic.com',
      handler: new CacheFirst({
        cacheName: 'google-fonts',
        plugins:   [],
      }),
    },

  ],
});

serwist.addEventListeners();
```

---

## 6. `app/offline/page.tsx` — Offline Fallback Page

Shown when a user is offline AND tries to navigate to
a page not in the precache. Friendly, on-brand, actionable.

```typescript
// app/offline/page.tsx

import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export default function OfflinePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 py-24 text-center">

        <div className="text-5xl mb-6">📡</div>

        <h1 className="font-serif text-2xl font-semibold text-navy mb-3">
          You're offline
        </h1>

        <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
          This page needs an internet connection. Please check
          your network and try again.
        </p>

        {/* Student pass hint */}
        <div className="rounded-xl border border-navy/10
          bg-[#F5F7FA] p-5 text-left mb-4">
          <p className="text-xs font-semibold text-navy mb-1">
            Looking for your fair pass?
          </p>
          <p className="text-xs text-gray-500">
            If you opened your pass page earlier, try going
            back — it may still be available from your browser
            cache.
          </p>
        </div>

        {/* Contact */}
        <p className="text-xs text-gray-400 mt-8">
          Need help?{' '}
          <a
            href="mailto:educationfair@iaesgujarat.org"
            className="text-navy underline"
          >
            educationfair@iaesgujarat.org
          </a>
        </p>

      </main>
      <SiteFooter />
    </>
  );
}
```

---

## 7. `app/layout.tsx` — Add Meta Tags

Add these inside the existing `<head>` metadata (or via
Next.js `generateMetadata`). Do NOT restructure the layout —
only add what's listed.

```typescript
// In app/layout.tsx — update the existing metadata export:

export const metadata: Metadata = {
  // ... keep all existing metadata ...

  // ADD:
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable:           true,
    statusBarStyle:    'default',
    title:             'IAES Fairs',
  },
  formatDetection: {
    telephone: false,
  },
};

// ADD these viewport settings:
export const viewport: Viewport = {
  themeColor:            '#0B2B5C',
  width:                 'device-width',
  initialScale:          1,
  maximumScale:          1,   // prevents iOS auto-zoom on inputs
  userScalable:          false,
};
```

Also add inside `<head>` in the JSX:

```html
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

---

## 8. NEW COMPONENT: `InstallHint.tsx`

Shows "Add to Home Screen" prompt to reps and students.
Client component — listens for the `beforeinstallprompt` event.
Dismissed state persisted in localStorage.
Only shown on mobile (Android Chrome primarily).
iOS shows a manual instruction instead.

```typescript
// components/InstallHint.tsx
'use client';

import { useState, useEffect } from 'react';

export function InstallHint() {
  const [prompt, setPrompt]       = useState<any>(null);
  const [dismissed, setDismissed] = useState(true);
  const [isIOS, setIsIOS]         = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already dismissed or installed
    if (localStorage.getItem('pwa-hint-dismissed') === '1') return;
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    setDismissed(false);

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
                !(window as any).MSStream;
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    localStorage.setItem('pwa-hint-dismissed', '1');
    setDismissed(true);
  }

  async function install() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') dismiss();
  }

  // Nothing to show
  if (dismissed || isInstalled) return null;

  // iOS — manual instruction
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50
        rounded-xl border border-navy/10 bg-white shadow-lg p-4
        flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">📱</span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-navy">
            Add to Home Screen
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Tap the Share button then "Add to Home Screen"
            for the best experience.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-gray-400 text-lg leading-none flex-shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    );
  }

  // Android / Chrome — native prompt available
  if (!prompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50
      rounded-xl border border-navy/10 bg-white shadow-lg p-4
      flex items-center gap-3">
      <span className="text-2xl flex-shrink-0">📱</span>
      <div className="flex-1">
        <p className="text-xs font-semibold text-navy">
          Install IAES Fairs
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Add to your home screen for instant access at the fair.
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={dismiss}
          className="text-xs text-gray-400 px-2 py-1"
        >
          Later
        </button>
        <button
          onClick={install}
          className="text-xs font-semibold bg-navy text-white
            px-3 py-1.5 rounded-lg"
        >
          Install
        </button>
      </div>
    </div>
  );
}
```

Add `<InstallHint />` at the bottom of `app/layout.tsx`
inside the body, after `<SiteFooter />` equivalent.
Show on scan and pass pages specifically (highest-value locations):

```typescript
// In app/scan/page.tsx — add at bottom:
<InstallHint />

// In app/pass/[passUuid]/page.tsx — add at bottom:
<InstallHint />

// Optionally in app/page.tsx (landing) as well
```

---

## 9. `public/robots.txt` — Ensure SW is accessible

```
# public/robots.txt — add if not already present
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Allow: /sw.js
Allow: /manifest.webmanifest
```

---

## 10. Netlify Headers — SW Scope

Add to `netlify.toml`:

```toml
[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
    Service-Worker-Allowed = "/"

[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Content-Type = "application/manifest+json"
    Cache-Control = "public, max-age=0, must-revalidate"
```

The `Service-Worker-Allowed: /` header is required —
Netlify serves sw.js from /public root but Next.js
may scope it to /_next without this header.

---

## BUILD ORDER FOR V17 PHASE 1

1.  `npm install serwist @serwist/next`
2.  Generate icons → place in `public/icons/`
    (192, 512, 512-maskable, 96, apple-touch-icon, favicon)
3.  Create `app/manifest.ts`
4.  Create `app/sw.ts` — service worker
5.  Update `next.config.ts` — wrap with withSerwist
6.  Create `app/offline/page.tsx`
7.  Update `app/layout.tsx` — manifest meta + viewport + apple tags
8.  Create `components/InstallHint.tsx`
9.  Add `<InstallHint />` to scan page + pass page
10. Update `netlify.toml` — SW headers
11. Add `public/robots.txt` if not present
12. Deploy to Netlify
13. Run verification checklist below

---

## VERIFICATION CHECKLIST

After deploy, verify on a REAL mobile device (not desktop DevTools):

```
□ 1. Android Chrome: visit fairs.iaesgujarat.org
     "Add to Home Screen" prompt appears (or menu option)
     Tap install → app icon appears on home screen
     Launch from home screen → opens without browser chrome
     Theme colour (#0B2B5C) shows in status bar

□ 2. iOS Safari: visit fairs.iaesgujarat.org
     Share sheet → "Add to Home Screen" option visible
     Installed → launches in full-screen (no Safari chrome)

□ 3. Offline test (critical — DO THIS):
     Install the app
     Load the landing page / (so it's cached)
     Turn OFF mobile data + WiFi
     Navigate to / → page loads from cache ✅
     Navigate to /admin → fails cleanly (not served stale) ✅
     Navigate to /api/anything → fails cleanly ✅
     Navigate to /payment → fails cleanly ✅
     /offline page shows for uncached navigations ✅

□ 4. Financial routes are NEVER served stale:
     Confirm /api/* returns network errors offline
     Confirm /admin/* is not accessible offline
     Confirm /payment/* is not accessible offline

□ 5. Camera still works in installed PWA:
     Open scanner from installed app
     Camera permission prompt appears
     QR scanning functions correctly

□ 6. Install hint shows on /scan and /pass pages
     Dismissed → does not reappear (localStorage persists)
     Already installed → hint does not appear

□ 7. Lighthouse PWA audit (Chrome DevTools):
     Score ≥ 90
     "Installable" ✅
     "PWA optimised" ✅

□ 8. SW does not interfere with Razorpay:
     Complete a test registration (proforma path)
     Payment page loads correctly
     No SW cache intercepts the Razorpay script
```

Do NOT approve Phase 2 until item 3 and 4 are verified.
Stale financial data is the failure mode to prevent.

---

## WHAT PHASE 1 DOES NOT DO

```
✗ Offline student pass QR     → Phase 2
✗ Offline rep scan queue      → Phase 3
✗ Web push notifications       → separate future project
✗ Background sync              → Phase 3
✗ Admin offline access         → never (by design)
✗ Any route or component change beyond InstallHint + layout meta
```

---

## CRITICAL RULES FOR V17 PHASE 1

- SW must be disabled in development (disable: NODE_ENV === 'development')
  — caching in dev causes confusing stale-code bugs
- The NEVER_CACHE list in sw.ts is the most important code in this file.
  If in doubt about any route: add it to NEVER_CACHE.
- `navigateFallbackAllowlist` must NOT include /admin, /payment,
  /invoice, /confirmation, /portal, /scan, /api — these must
  fail offline, not show the offline page with stale state
- Service worker scope = / (root) — enforced by Netlify header
- `skipWaiting: true` means new SW activates immediately on deploy.
  This is correct for this app — we want fresh code fast.
- `maximumScale: 1` in viewport prevents iOS from zooming on form
  inputs — important for the registration and scan forms
- iOS install: manual process (Share → Add to Home Screen).
  Do not promise native iOS push notifications — iOS 16.4+ only
  and installed-only. Out of scope for P1.
- Do NOT rebuild anything from v2–v16.
