import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SubscribeForm } from "@/components/SubscribeForm";

export const metadata: Metadata = {
  title: "Subscribe for future events | IAES International Education Fairs",
  description:
    "Be first to know when the next IAES International Education Fair opens. Universities and students — leave your details and we'll notify you by email and WhatsApp.",
  robots: "index, follow",
};

export default function SubscribePage() {
  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
            Stay in the loop
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
            Subscribe for future events
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-navy/70">
            Be first to know when our next education fair opens. Tell us a
            little about yourself and we&rsquo;ll reach out — by email and
            WhatsApp — the moment registrations go live. Universities, share
            when you like to travel and we&rsquo;ll plan around you.
          </p>
        </header>

        <div className="mt-10 rounded-2xl bg-white p-6 shadow-card sm:p-8">
          <SubscribeForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
