import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms & Conditions — IAES Education Fair 2026",
  description:
    "Terms and Conditions for participation in the IAES U.S. University Education Outreach Tour and Fair.",
  robots: "index, follow",
};

const CLAUSES = [
  { id: "scope", label: "1. Scope of the Event" },
  { id: "registration", label: "2. Registration & Participation" },
  { id: "facilities", label: "3. Facilities Provided by IAES" },
  { id: "transportation", label: "4. Transportation" },
  { id: "materials", label: "5. Materials & Display" },
  { id: "payment", label: "6. Payment Terms" },
  { id: "cancellation", label: "7. Cancellation Policy" },
  { id: "no-show", label: "8. No-Show Policy" },
  { id: "force-majeure", label: "9. Force Majeure" },
  { id: "liability", label: "10. Limitation of Liability" },
  { id: "conduct", label: "11. Conduct & Compliance" },
  { id: "data", label: "12. Data & Privacy" },
  { id: "governing-law", label: "13. Governing Law" },
  { id: "amendments", label: "14. Amendments" },
  { id: "entire-agreement", label: "15. Entire Agreement" },
];

export default function TermsPage() {
  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          {/* Sidebar (sticky on desktop) */}
          <aside className="hidden lg:block">
            <nav className="sticky top-6 rounded-lg border border-navy/10 bg-cream/50 p-5 text-sm">
              <p className="mb-3 text-xs uppercase tracking-wider text-navy/55">
                Jump to
              </p>
              <ul className="space-y-1.5">
                {CLAUSES.map((c) => (
                  <li key={c.id}>
                    <a
                      href={`#${c.id}`}
                      className="block text-navy/75 hover:text-navy hover:underline"
                    >
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="prose prose-navy max-w-none text-navy/85 print:max-w-none">
            <header className="not-prose mb-8 border-b border-navy/10 pb-6">
              <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
                IAES U.S. University Education Outreach Tour &amp; Fair
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
                Terms &amp; Conditions
              </h1>
              <p className="mt-3 text-sm text-navy/60">
                Version <strong>2026.1</strong> · Effective{" "}
                <strong>1 January 2026</strong> · Governed by the laws of the
                Republic of India.
              </p>
            </header>

            <p className="text-sm leading-relaxed">
              These Terms and Conditions (&ldquo;Terms&rdquo;) constitute a
              binding legal agreement between{" "}
              <strong>Indo American Education Society</strong>{" "}
              (&ldquo;IAES&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;,
              &ldquo;our&rdquo;), a nonprofit organisation registered under the
              Charitable Trust Act, 1950, having its registered office at 3rd
              Floor, 301-302, Sun Square, Near Xavier&rsquo;s Corner, Off C G
              Road, Navarangpura, Ahmedabad – 380009, Gujarat, India (GSTIN:
              24AAATI2674J1ZM), and the{" "}
              <strong>Participating Institution</strong>{" "}
              (&ldquo;University&rdquo;, &ldquo;you&rdquo;,
              &ldquo;your&rdquo;) registering for the IAES U.S. University
              Education Outreach Tour and Fair (&ldquo;the Event&rdquo;). By
              completing the online registration and/or making payment, the
              University unconditionally agrees to be bound by these Terms.
            </p>

            <Section id="scope" title="1. Scope of the Event">
              <p>
                1.1 The IAES U.S. University Education Outreach Tour and Fair
                comprises:
              </p>
              <ul>
                <li>
                  Institutional visits to schools, colleges, and universities
                  across select Gujarat cities.
                </li>
                <li>An Open U.S. University Education Fair held in Ahmedabad.</li>
              </ul>
              <p>
                1.2 The planned cities for institutional visits include{" "}
                <strong>Ahmedabad, Changa, and Vadodara</strong>, subject to
                confirmation and availability. IAES reserves the right to
                modify, add, or remove venues from the itinerary without prior
                notice.
              </p>
              <p>
                1.3 The detailed itinerary, including confirmed venue names,
                addresses, and timings, will be shared with registered
                participants no later than{" "}
                <strong>four (4) weeks before the commencement</strong> of the
                Event.
              </p>
            </Section>

            <Section id="registration" title="2. Registration & Participation">
              <p>
                2.1 Registration is confirmed only upon receipt of full payment
                as per the applicable pricing tier (Standard or Early Bird).
              </p>
              <p>
                2.2 Each registration entitles the University to{" "}
                <strong>one (1) counter space</strong> at the Fair and
                institutional visits, unless an additional table has been
                booked and paid for separately.
              </p>
              <p>
                2.3 Each registration includes one (1) counter/table space and
                a maximum of <strong>two (2) University Representatives</strong>{" "}
                as the default allocation. Additional representatives may be
                added during registration at a fee of{" "}
                <strong>USD 100 per representative</strong>. The maximum number
                of representatives permitted is <strong>two (2) per table</strong>
                {" "}booked (e.g. 2 tables = max 4 representatives).
              </p>
              <p>
                2.4 Universities requiring additional counter/table space may
                book up to a maximum of <strong>three (3) tables</strong> in
                total. Each additional table beyond the default is charged at{" "}
                <strong>USD 300 per table</strong>. Add-on fees (extra tables
                and extra representatives) are added to the base registration
                fee and appear as separate line items on the invoice. All
                add-on fees are subject to the same GST rules and cancellation
                policy as the base registration fee.
              </p>
              <p>
                2.5 All representatives must carry valid identification. IAES
                reserves the right to deny access to any individual not listed
                in the registration.
              </p>
            </Section>

            <Section id="facilities" title="3. Facilities Provided by IAES">
              <p>
                IAES will arrange and provide the following to all confirmed
                participating institutions:
              </p>
              <p>
                3.1 <strong>Counter space</strong> with chairs at the Fair
                venue and during institutional visits.
              </p>
              <p>
                3.2 <strong>Drinking water</strong> at each fair/visit
                location.
              </p>
              <p>
                3.3 <strong>Meals</strong> (lunch and/or refreshments, as
                applicable) during institutional visits and the main Fair.
              </p>
              <p>
                3.4 <strong>Transportation</strong>: Group transportation from
                a designated boarding point to institutional visit locations
                and the Fair venue, and return drop-off to the designated
                point. The transportation schedule will be communicated in the
                itinerary.
              </p>
            </Section>

            <Section id="transportation" title="4. Transportation — Scope & Limitations">
              <p>
                4.1 IAES will arrange group transportation{" "}
                <strong>exclusively</strong> for movement between the
                designated boarding point, institutional visit locations, and
                the Fair venue.
              </p>
              <p>
                4.2{" "}
                <strong>
                  Transportation will not be available for personal visits,
                  sightseeing, shopping, or any activity outside the official
                  Event itinerary.
                </strong>{" "}
                Any personal travel arrangements required by the University or
                its representatives are entirely at the University&rsquo;s own
                cost and responsibility.
              </p>
              <p>
                4.3 IAES is not liable for any delays caused by traffic, road
                conditions, or other factors beyond our reasonable control.
              </p>
            </Section>

            <Section id="materials" title="5. Materials & Display">
              <p>
                5.1 Universities are encouraged to ship promotional materials
                (brochures, banners, standees, merchandise) in advance. Details
                of the shipping address and deadlines will be provided in the
                Event briefing pack.
              </p>
              <p>
                5.2 In the event that a University&rsquo;s registered
                representatives are unable to attend — for any reason — and
                materials have been received by IAES prior to the Event, IAES
                will endeavour to display the University&rsquo;s materials at
                the allocated counter space. However, IAES does not guarantee
                the manner or prominence of such display and will not provide
                a live representative on behalf of the University.
              </p>
              <p>
                5.3 IAES accepts no liability for any loss, damage, or theft
                of materials during transit, storage, or at the venue.
              </p>
            </Section>

            <Section id="payment" title="6. Payment Terms">
              <p>
                6.1 All fees must be paid in full at the time of registration.
              </p>
              <p>
                6.2 <strong>USD Payments:</strong> No GST is applicable.
                Invoice will be issued in USD.
              </p>
              <p>
                6.3 <strong>INR Payments:</strong> The INR amount is
                calculated based on the live USD–INR exchange rate at the time
                of invoice generation. GST at the applicable rate will be
                charged in addition:
              </p>
              <ul>
                <li>
                  Intra-state (Gujarat-registered entities): CGST 9% + SGST 9%
                </li>
                <li>
                  Inter-state (entities registered outside Gujarat): IGST 18%
                </li>
                <li>Unregistered entities: IGST 18%</li>
              </ul>
              <p>
                6.4 The forex rate applied will be stated on the invoice and
                is locked at the time of invoice generation. No adjustments
                will be made for subsequent rate movements.
              </p>
              <p>
                6.5 Payments must be completed within{" "}
                <strong>seven (7) days</strong> of invoice issuance.
                Registrations where payment is not received within this period
                may be cancelled at IAES&rsquo;s discretion, and the slot may
                be offered to another institution.
              </p>
            </Section>

            <Section id="cancellation" title="7. Cancellation Policy">
              <p>
                7.1 All cancellation requests must be submitted in writing to{" "}
                <strong>eduadviser@iaesgujarat.org</strong> with the subject
                line: &ldquo;Cancellation Request — [University Name] —
                [Invoice Number]&rdquo;.
              </p>
              <p>
                7.2 The date of receipt of the written cancellation request by
                IAES will be treated as the effective cancellation date.
              </p>
              <p>
                7.3 Refunds, where applicable, will be processed within{" "}
                <strong>thirty (30) business days</strong> of the cancellation
                confirmation and will be issued in the same currency as the
                original payment.
              </p>
              <p>7.4 The following cancellation schedule applies:</p>

              <div className="not-prose my-6 overflow-x-auto rounded-lg border border-gold/40 bg-gold/5 p-1">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-navy text-white">
                    <tr>
                      <th className="px-4 py-2.5 text-left">
                        Cancellation Received
                      </th>
                      <th className="px-4 py-2.5 text-left">Refund</th>
                    </tr>
                  </thead>
                  <tbody className="text-navy/85">
                    <tr className="border-b border-navy/10">
                      <td className="px-4 py-2.5">
                        60 or more days before the Fair start date
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-emerald-700">
                        75% refund
                      </td>
                    </tr>
                    <tr className="border-b border-navy/10">
                      <td className="px-4 py-2.5">
                        30 to 59 days before the Fair start date
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-yellow-700">
                        50% refund
                      </td>
                    </tr>
                    <tr className="border-b border-navy/10">
                      <td className="px-4 py-2.5">
                        15 to 29 days before the Fair start date
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-orange-700">
                        25% refund
                      </td>
                    </tr>
                    <tr className="border-b border-navy/10">
                      <td className="px-4 py-2.5">
                        Less than 15 days before the Fair start date
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-red-700">
                        No refund
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5">
                        No-show (no prior cancellation notice)
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-red-700">
                        No refund
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                7.5 <strong>GST amounts are non-refundable</strong> as they
                are remitted to the government upon invoice issuance. Refund
                calculations above apply to the base registration fee only.
              </p>
              <p>
                7.6 IAES reserves the right to apply a{" "}
                <strong>processing fee of USD 100</strong> (or INR equivalent)
                on all approved refunds to cover administrative costs.
              </p>
            </Section>

            <Section id="no-show" title="8. No-Show Policy">
              <div className="not-prose my-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                <p>
                  8.1 If a University fails to attend the Event without prior
                  written cancellation notice, the registration fee is{" "}
                  <strong>forfeited entirely</strong>. No refund, credit, or
                  transfer will be issued.
                </p>
                <p className="mt-2">
                  8.2 A University will be considered a no-show if its
                  representatives do not report to the designated boarding
                  point within <strong>thirty (30) minutes</strong> of the
                  communicated departure time on the first day of the Event.
                </p>
              </div>
            </Section>

            <Section id="force-majeure" title="9. Force Majeure & Event Modifications">
              <div className="not-prose my-4 rounded-md border border-navy/15 bg-cream/60 p-4 text-sm text-navy/85">
                <p>
                  9.1 IAES will not be responsible for unanticipated or
                  unscheduled closures, cancellations, or modifications to the
                  Event caused by circumstances beyond our reasonable control,
                  including but not limited to: natural disasters, pandemics,
                  government orders, civil unrest, venue unavailability, or
                  acts of God (&ldquo;Force Majeure Events&rdquo;).
                </p>
                <p className="mt-2">
                  9.2 In the event of a Force Majeure Event, IAES may, at its
                  sole discretion:
                </p>
                <ul className="ml-5 mt-1 list-disc">
                  <li>Reschedule the Event to alternative dates.</li>
                  <li>
                    Modify the itinerary, venues, or format (including
                    conducting the Event in a hybrid or virtual format).
                  </li>
                  <li>
                    Cancel the Event entirely and issue a credit note or
                    partial refund.
                  </li>
                </ul>
                <p className="mt-2">
                  9.3 IAES&rsquo;s liability in case of a Force Majeure Event
                  is limited to a{" "}
                  <strong>
                    maximum of 50% of the registration fee paid
                  </strong>
                  , excluding GST.
                </p>
              </div>
            </Section>

            <Section id="liability" title="10. IAES's Limitation of Liability">
              <p>
                10.1 IAES&rsquo;s total liability to the University under
                these Terms shall not exceed the registration fee paid by the
                University for the Event.
              </p>
              <p>10.2 IAES is not liable for:</p>
              <ul>
                <li>
                  Any loss of business, revenue, opportunity, or goodwill.
                </li>
                <li>
                  Personal injury or property damage not directly caused by
                  IAES negligence.
                </li>
                <li>
                  Actions or omissions of third-party vendors, venues, or
                  transportation providers.
                </li>
              </ul>
            </Section>

            <Section id="conduct" title="11. Conduct & Compliance">
              <p>
                11.1 The University and its representatives agree to conduct
                themselves professionally and in accordance with the laws of
                India throughout the Event.
              </p>
              <p>
                11.2 IAES reserves the right to remove any representative from
                the Event without refund if their conduct is deemed
                disruptive, offensive, or harmful to other participants or
                students.
              </p>
              <p>
                11.3 The University confirms that all materials and
                communications at the Event are accurate, lawful, and
                compliant with applicable Indian and US regulations governing
                educational institutions and admissions.
              </p>
            </Section>

            <Section id="data" title="12. Data & Privacy">
              <p>
                12.1 Student contact information and profiles collected at the
                Event (via QR scan or otherwise) may only be used by the
                University for legitimate admissions and educational advisory
                purposes.
              </p>
              <p>
                12.2 The University agrees not to sell, share, or transfer
                student data obtained at the Event to any third party.
              </p>
              <p>
                12.3 The University acknowledges that students have the right
                to withdraw consent at any time, and agrees to honour such
                requests promptly.
              </p>
              <p>
                12.4 By registering, the University consents to IAES using the
                University&rsquo;s name and logo in Event-related promotional
                materials, press releases, and reports.
              </p>
            </Section>

            <Section id="governing-law" title="13. Governing Law & Dispute Resolution">
              <p>
                13.1 These Terms are governed by and shall be construed in
                accordance with the laws of the Republic of India.
              </p>
              <p>
                13.2 In the event of any dispute arising out of or in
                connection with these Terms, the parties shall first attempt
                to resolve the matter amicably through good-faith negotiations.
              </p>
              <p>
                13.3 If the dispute is not resolved within{" "}
                <strong>thirty (30) days</strong> of written notice, it shall
                be referred to arbitration under the{" "}
                <strong>Arbitration and Conciliation Act, 1996</strong>, with
                a sole arbitrator appointed by mutual consent.
              </p>
              <p>
                13.4 The seat of arbitration shall be{" "}
                <strong>Ahmedabad, Gujarat, India</strong>. The language of
                arbitration shall be English.
              </p>
              <p>
                13.5 Subject to the arbitration clause above, the courts of{" "}
                <strong>Ahmedabad, Gujarat</strong> shall have exclusive
                jurisdiction.
              </p>
            </Section>

            <Section id="amendments" title="14. Amendments">
              <p>
                14.1 IAES reserves the right to amend these Terms at any time.
                Material changes will be communicated to registered
                participants by email with at least{" "}
                <strong>fourteen (14) days&rsquo;</strong> notice.
              </p>
              <p>
                14.2 Continued participation following notice of amended Terms
                constitutes acceptance of the revised Terms.
              </p>
            </Section>

            <Section id="entire-agreement" title="15. Entire Agreement">
              <p>
                15.1 These Terms, together with the registration confirmation
                and invoice, constitute the entire agreement between IAES and
                the University with respect to the Event and supersede all
                prior discussions, representations, or agreements.
              </p>
            </Section>

            <div className="mt-12 border-t border-navy/10 pt-6 text-xs text-navy/60">
              <p>
                <strong>Indo American Education Society</strong>
                <br />
                3rd Floor, 301-302, Sun Square, Near Xavier&rsquo;s Corner,
                Off C G Road,
                <br />
                Navarangpura, Ahmedabad – 380009, Gujarat, India
                <br />
                GSTIN: 24AAATI2674J1ZM · PAN: AAATI2674J
                <br />
                eduadviser@iaesgujarat.org · +91 97264 80899
              </p>
              <Link
                href="/"
                className="mt-4 inline-block text-navy hover:text-gold-600"
              >
                &larr; Back to home
              </Link>
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mt-10 font-serif text-2xl font-semibold text-navy">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
