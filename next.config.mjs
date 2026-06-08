import withSerwistInit from "@serwist/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer ships ESM-only — transpile it so client bundles work.
  // CRITICAL: this option MUST be preserved when wrapping with Serwist.
  // Dropping it breaks invoice PDF generation everywhere.
  transpilePackages: ["@react-pdf/renderer"],
  experimental: {
    // The signed W-8BEN-E lives under docs/ (NOT public/, so it is never
    // served at a public URL). Next's output tracer won't follow the
    // runtime readFileSync, so pull it into the bundles of every function
    // that attaches/streams it, or it 404s in production.
    outputFileTracingIncludes: {
      "/api/register": ["./docs/w8bene-06-08-2026.pdf"],
      "/api/admin/registrations/[id]/remind": ["./docs/w8bene-06-08-2026.pdf"],
      "/api/admin/registrations/[id]/resend-proforma": [
        "./docs/w8bene-06-08-2026.pdf",
      ],
      "/api/invoice/[registrationId]/w8": ["./docs/w8bene-06-08-2026.pdf"],
      // processPayment.ts (confirmation email) runs inside these routes.
      "/api/razorpay/webhook": ["./docs/w8bene-06-08-2026.pdf"],
      "/api/razorpay/verify": ["./docs/w8bene-06-08-2026.pdf"],
      "/api/admin/registrations/[id]/confirm-payment": [
        "./docs/w8bene-06-08-2026.pdf",
      ],
    },
  },
};

// v17 Phase 1 — wrap the app in a Serwist-managed service worker.
// SW source lives at app/sw.ts (it never runs as a route; only Serwist
// reads it). disable: dev → no caching while we develop.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
