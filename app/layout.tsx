import type { Metadata } from "next";
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
