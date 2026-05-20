import withSerwistInit from "@serwist/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer ships ESM-only — transpile it so client bundles work.
  // CRITICAL: this option MUST be preserved when wrapping with Serwist.
  // Dropping it breaks invoice PDF generation everywhere.
  transpilePackages: ["@react-pdf/renderer"],
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
