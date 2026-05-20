import type { MetadataRoute } from "next";

// v17 Phase 1 — Web App Manifest (served at /manifest.webmanifest).
// Browsers / Android use this to enable "Add to Home Screen" and
// render the install prompt.
//
// Icon purposes:
//   - 192 / 512 are "any": logo fills the canvas edge-to-edge
//     (transparent corners are fine).
//   - maskable-512 has the logo within the centre 80% safe zone
//     on white, so Android adaptive shapes never clip the ring text.
//
// theme_color = navy (brand). background_color = white (matches the
// maskable bg + the splash that appears while the app loads).

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IAES International Education Fairs",
    short_name: "IAES Fairs",
    description:
      "Register for IAES U.S. university education fairs in Gujarat — universities, institutions, and students.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0B2B5C",
    categories: ["education", "business"],
    lang: "en",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
