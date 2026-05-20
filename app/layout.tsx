import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "IAES | International Education Fairs",
  description:
    "Official IAES platform for U.S. university registration at International Education Fairs in Gujarat.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://fairs.iaesgujarat.org"
  ),
  // v17 — PWA install metadata. The manifest itself is auto-linked
  // by Next from app/manifest.ts; we only declare the iOS-specific
  // bits here, plus disable auto-linkification of phone numbers
  // (the site uses explicit <a href="tel:..."> where appropriate).
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IAES Fairs",
  },
  formatDetection: {
    telephone: false,
  },
};

// v17 — viewport meta. Pinch-zoom is INTENTIONALLY left enabled (the
// browser default) to keep WCAG 1.4.4 — Resize Text. Disabling it
// would block users who need to zoom to read; the iOS form-input
// auto-zoom annoyance is a separate, fixable, and far smaller issue.
export const viewport: Viewport = {
  themeColor: "#0B2B5C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-cream font-sans text-navy antialiased">
        {children}
      </body>
    </html>
  );
}
