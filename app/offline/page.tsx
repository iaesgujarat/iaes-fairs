import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

// v17 Phase 1 — offline fallback. Shown when the SW determines a
// navigation cannot be served from cache. Deliberately friendly +
// actionable; never used for /admin /payment /invoice /api etc.
// (those are NetworkOnly and fail hard, by design).

export const metadata = {
  title: "Offline · IAES Fairs",
};

export default function OfflinePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="mb-6 text-5xl" aria-hidden>
          📡
        </div>

        <h1 className="mb-3 font-serif text-2xl font-semibold text-navy">
          You&rsquo;re offline
        </h1>

        <p className="mx-auto mb-8 max-w-sm text-sm text-gray-500">
          This page needs an internet connection. Check your network and
          try again.
        </p>

        <div className="mb-4 rounded-xl border border-navy/10 bg-[#F5F7FA] p-5 text-left">
          <p className="mb-1 text-xs font-semibold text-navy">
            Looking for your fair pass?
          </p>
          <p className="text-xs text-gray-500">
            If you opened your pass page earlier, try going back — it
            may still be available from your browser cache.
          </p>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          Need help?{" "}
          <a
            href="mailto:educationfair@iaesgujarat.org"
            className="text-navy underline underline-offset-2"
          >
            educationfair@iaesgujarat.org
          </a>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
