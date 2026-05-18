import { WaitlistForm } from "@/components/WaitlistForm";
import type { Fair } from "@/types";

function formatMonthYear(dateStr: string | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

const BENEFITS = [
  {
    icon: "⚡",
    title: "First Access",
    desc: "Registration link before public announcement",
  },
  {
    icon: "⭐",
    title: "Early Bird Rate",
    desc: "Automatic early bird pricing guaranteed",
  },
  {
    icon: "📋",
    title: "Priority Booth",
    desc: "First pick of booth placement at the fair",
  },
];

export function BetweenFairsPage({
  lastFair,
  pastFairs,
}: {
  lastFair: Fair | null;
  pastFairs: Fair[];
}) {
  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="mb-4 text-xs uppercase tracking-[0.18em] text-gold-400">
            Indo American Education Society · Ahmedabad
          </p>
          <h1 className="font-serif text-4xl font-semibold sm:text-5xl">
            IAES Education Fairs
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Connecting U.S. universities with Gujarat&rsquo;s brightest
            students through curated outreach tours and open fairs.
          </p>

          {lastFair && (
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white/80">
              <span className="text-green-400">✓</span>
              {lastFair.name} — Successfully Concluded
              {lastFair.stat_universities_participated ? (
                <span className="ml-1 text-white/50">
                  · {lastFair.stat_universities_participated} universities ·{" "}
                  {lastFair.stat_students_attended?.toLocaleString()} students
                </span>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* ── Coming Soon + Waitlist ────────────────────────── */}
      <section className="bg-[#F5F7FA] py-16">
        <div className="mx-auto max-w-2xl px-6">
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-navy">
              🔔 Next Fair — Coming Soon
            </span>
            <h2 className="mt-4 font-serif text-3xl font-semibold text-navy">
              Be First in Line
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-gray-600">
              Registration for our next fair opens soon. Sign up below and
              you&rsquo;ll be the first to know — with automatic early bird
              pricing when you register.
            </p>
          </div>

          <div className="mb-10 grid grid-cols-3 gap-4">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-xl border border-navy/10 bg-white p-4 text-center shadow-sm"
              >
                <span className="text-2xl">{b.icon}</span>
                <p className="mt-2 text-xs font-semibold text-navy">
                  {b.title}
                </p>
                <p className="mt-1 text-xs text-gray-500">{b.desc}</p>
              </div>
            ))}
          </div>

          <WaitlistForm />

          <p className="mt-6 text-center text-xs text-gray-400">
            Already participated in a past IAES fair?{" "}
            <span className="font-medium text-navy">
              You&rsquo;re already on our list.
            </span>{" "}
            No need to sign up again.
          </p>
        </div>
      </section>

      {/* ── Past Fairs ────────────────────────────────────── */}
      {pastFairs.length > 0 && (
        <section className="bg-white py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h3 className="mb-6 font-serif text-xl font-semibold text-navy">
              Past Fairs
            </h3>
            <div className="space-y-3">
              {pastFairs.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-xl border border-navy/10 bg-[#F5F7FA] px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg text-green-500">✓</span>
                    <div>
                      <p className="text-sm font-semibold text-navy">
                        {f.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatMonthYear(f.fair_date_start || f.fair_date)} ·{" "}
                        {f.city}
                      </p>
                    </div>
                  </div>
                  {f.stat_universities_participated ? (
                    <div className="hidden text-right sm:block">
                      <p className="text-xs font-semibold text-navy">
                        {f.stat_universities_participated} universities
                      </p>
                      <p className="text-xs text-gray-500">
                        {f.stat_students_attended?.toLocaleString()} students
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Contact ───────────────────────────────────────── */}
      <section className="bg-navy py-12 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm text-white/70">
            Questions about upcoming fairs?
          </p>
          <p className="mt-2">
            <a
              href="mailto:educationfair@iaesgujarat.org"
              className="font-semibold text-gold hover:underline"
            >
              educationfair@iaesgujarat.org
            </a>
            {" · "}
            <a
              href="tel:+919726480899"
              className="font-semibold text-gold hover:underline"
            >
              +91 9726480899
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
