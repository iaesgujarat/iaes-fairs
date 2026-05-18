import Link from "next/link";
import { getFairPricing } from "@/lib/pricing";
import { isRegistrationOpen, isStudentPassOpen } from "@/lib/fairStatus";
import type { Fair } from "@/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatINRPlain(amount: number): string {
  return new Intl.NumberFormat("en-IN").format(amount);
}

/**
 * Status-gated registration CTAs (University / Institution / Campus Host
 * + student pass). Extracted verbatim from the landing page so page.tsx
 * stays lean; behaviour is unchanged from v1–v11.
 */
export function FairCTASection({ fair }: { fair: Fair }) {
  const status = fair.status ?? "PUBLISHED";
  const pricing = getFairPricing(fair);
  const showUniInstCTAs = isRegistrationOpen(status);
  const showStudentCTA = isStudentPassOpen(status);

  return (
    <section id="register" className="bg-[#F5F7FA] py-16 scroll-mt-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-3xl font-semibold text-navy sm:text-4xl">
            {showUniInstCTAs ? "Register for the Fair" : "Fair Programme"}
          </h2>
          {showUniInstCTAs ? (
            <p className="mt-3 text-sm text-gray-500">
              Registration closes{" "}
              <span className="font-semibold text-navy">
                {fair.registration_deadline
                  ? formatDate(fair.registration_deadline)
                  : "soon"}
              </span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              {status === "ONGOING"
                ? "Universities are now at their booths. Students can still get a pass."
                : "Registration is closed. Thank you for your interest."}
            </p>
          )}
        </div>

        {showUniInstCTAs && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: University */}
            <div className="relative flex flex-col rounded-2xl border border-navy/10 bg-white p-8 shadow-card">
              {pricing.isEarlyBird && pricing.earlybirdDeadline && (
                <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-1 text-xs font-bold text-navy shadow-sm">
                  <span aria-hidden>🟡</span>
                  Early Bird — Ends {formatDate(pricing.earlybirdDeadline)}
                </div>
              )}

              <div className="mt-2">
                <span className="text-2xl" aria-hidden>🎓</span>
                <h3 className="mt-3 font-serif text-xl font-semibold text-navy">
                  U.S. University
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Register your university for a booth at the fair. Meet
                  Gujarat&rsquo;s top students and institutions.
                </p>
              </div>

              <div className="mt-6 rounded-xl bg-[#F5F7FA] p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-navy">
                    USD {pricing.priceUSD.toLocaleString()}
                  </span>
                  {pricing.isEarlyBird && pricing.savingUSD > 0 && (
                    <span className="text-sm font-medium text-green-600">
                      Save USD {pricing.savingUSD}
                    </span>
                  )}
                </div>

                {pricing.priceINR != null && (
                  <p className="mt-1 text-xs text-gray-400">
                    ≈ ₹{formatINRPlain(pricing.priceINR)} + GST if paying in INR
                  </p>
                )}

                {pricing.isEarlyBird && (
                  <p className="mt-1 text-xs text-gray-400 line-through">
                    Standard: USD {pricing.standardUSD.toLocaleString()}
                    {pricing.standardINR != null
                      ? ` / ₹${formatINRPlain(pricing.standardINR)}`
                      : ""}
                  </p>
                )}
              </div>

              {fair.includes && fair.includes.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {fair.includes.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-xs text-gray-500"
                    >
                      <span className="mt-0.5 text-gold" aria-hidden>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href="/register/university"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-navy/90"
              >
                {fair.payment_gateway_active
                  ? "Register & Pay Now"
                  : "Register Now — Pay Later"}
                <span aria-hidden>&rarr;</span>
              </Link>

              <p className="mt-3 text-center text-xs text-gray-400">
                {fair.payment_gateway_active
                  ? "Invoice + Razorpay payment link sent by email"
                  : "Payment gateway opens soon — register now to secure your spot. Proforma Invoice emailed instantly."}
              </p>
            </div>

            {/* Card 2: Institution */}
            <div className="flex flex-col rounded-2xl border border-navy/10 bg-white p-8 shadow-card">
              <div>
                <span className="text-2xl" aria-hidden>🏫</span>
                <h3 className="mt-3 font-serif text-xl font-semibold text-navy">
                  Indian Institution
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Register your school, college, or university to bring
                  students to the fair.
                </p>
              </div>

              <div className="mt-6 rounded-xl bg-[#F5F7FA] p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-navy">FREE</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  No registration fee for Indian institutions
                </p>
              </div>

              <ul className="mt-4 space-y-1.5">
                {[
                  "Bring your students to meet U.S. university reps",
                  "Access to all participating universities",
                  "Confirmation letter for your institution records",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs text-gray-500"
                  >
                    <span className="mt-0.5 text-gold" aria-hidden>✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/register/institution"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-semibold text-navy shadow-card transition-colors hover:bg-gold/90"
              >
                Register Free
                <span aria-hidden>&rarr;</span>
              </Link>

              <p className="mt-3 text-center text-xs text-gray-400">
                Confirmation email sent instantly
              </p>
            </div>

            {/* Card 3: Campus Host (Indian HEI invites US reps) */}
            <div className="flex flex-col rounded-2xl border border-navy/10 bg-white p-8 shadow-card">
              <div>
                <span className="text-2xl" aria-hidden>🏛️</span>
                <h3 className="mt-3 font-serif text-xl font-semibold text-navy">
                  Host on Your Campus
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Indian higher-ed institution? Invite visiting U.S.
                  university reps to come directly to your campus.
                </p>
              </div>

              <div className="mt-6 rounded-xl bg-[#F5F7FA] p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-navy">
                    By invitation
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Enabled by IAES per fair, once visiting universities are
                  confirmed
                </p>
              </div>

              <ul className="mt-4 space-y-1.5">
                {[
                  "U.S. university reps visit your campus",
                  "Curated to your students' study programs",
                  "IAES coordinates the visit itinerary",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs text-gray-500"
                  >
                    <span className="mt-0.5 text-gold" aria-hidden>✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              {fair.campus_host_requests_active ? (
                <>
                  <Link
                    href="/register/campus-host"
                    className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md border border-navy bg-white px-6 py-3 text-sm font-semibold text-navy shadow-card transition-colors hover:bg-navy hover:text-white"
                  >
                    Request a Campus Visit
                    <span aria-hidden>&rarr;</span>
                  </Link>
                  <p className="mt-3 text-center text-xs text-gray-400">
                    IAES reviews each request and confirms by email
                  </p>
                </>
              ) : (
                <>
                  <div
                    aria-disabled="true"
                    className="mt-8 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-navy/15 bg-[#F5F7FA] px-6 py-3 text-sm font-semibold text-navy/40"
                  >
                    Request a Campus Visit
                  </div>
                  <p className="mt-3 text-center text-xs text-gray-400">
                    This programme is activated by IAES once visiting
                    universities and an itinerary are confirmed for the
                    fair. To register interest, email{" "}
                    <a
                      href="mailto:eduadviser@iaesgujarat.org?subject=Campus%20Host%20Request%20%E2%80%94%20Interest"
                      className="font-medium text-navy underline underline-offset-2"
                    >
                      eduadviser@iaesgujarat.org
                    </a>
                    .
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Student CTA — visible during PUBLISHED and ONGOING */}
        {showStudentCTA && (
          <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-6 text-center">
            <p className="text-sm font-medium text-navy">
              <span aria-hidden>🎓</span>{" "}
              {status === "ONGOING"
                ? "Walk-in student? Get your pass now"
                : "Are you a student planning to attend?"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Register for your free digital pass — show it at each university
              booth.
            </p>
            <Link
              href="/student"
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-gold bg-white px-6 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-gold/10"
            >
              Get My Free Pass <span aria-hidden>&rarr;</span>
            </Link>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          Questions? Email us at{" "}
          <a
            href="mailto:eduadviser@iaesgujarat.org"
            className="font-medium text-navy underline underline-offset-2"
          >
            eduadviser@iaesgujarat.org
          </a>{" "}
          or call{" "}
          <a href="tel:+919825593262" className="font-medium text-navy">
            +91 98255 93262
          </a>
        </p>
      </div>
    </section>
  );
}
