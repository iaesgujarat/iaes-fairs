const VISION = [
  "Be the primary, trusted source of guidance for students aspiring to study in the U.S. and other top destinations.",
  "Provide accurate, comprehensive, current, and unbiased information on global education opportunities.",
  "Strengthen institutional ties between Gujarat and universities abroad, building a lasting repository of knowledge.",
  "Grow a connected community of outbound students through seminars and the fair.",
];

export function AboutSociety() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
              A Trusted Non-Profit Organisation
            </p>
            <h2 className="mt-3 max-w-2xl font-serif text-2xl font-semibold leading-snug text-navy sm:text-3xl">
              A world-class education — led by the U.S., now wider than ever
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-navy/75">
              The United States offers an unmatched breadth of academic
              programs, world-renowned institutions, and a flexibility in
              higher education found almost nowhere else — which is why it
              remains the destination of choice for ambitious students. At
              our fair that horizon goes further still: alongside leading
              U.S. universities, you can meet institutions from other top
              global study-abroad destinations.
            </p>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-navy/75">
              Guided by our principles of Aspiration, Belief, and
              Connection, the Indo-American Education Society is a trusted
              non-profit providing accurate, comprehensive, and unbiased
              guidance on studying abroad — with deep, continuing expertise
              in U.S. higher education — and supporting universities in
              their recruitment and campus-internationalisation goals.
              Consider us your authoritative resource: where aspirations
              are nurtured, beliefs are reinforced, and meaningful
              connections are forged.
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-lg border border-navy/10 bg-cream/40 p-6 shadow-card sm:p-8">
              <h3 className="font-serif text-lg font-semibold text-navy">
                Our Vision
              </h3>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-navy/80">
                {VISION.map((v) => (
                  <li key={v} className="flex gap-2.5">
                    <span className="mt-0.5 text-gold-500" aria-hidden>
                      &#10003;
                    </span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
