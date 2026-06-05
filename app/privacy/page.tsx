import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — IAES International Education Fair",
  description:
    "How the Indo American Education Society collects, uses, shares, and protects personal data — including email and WhatsApp communications — for its International Education Fairs.",
  robots: "index, follow",
};

const CLAUSES = [
  { id: "who-we-are", label: "1. Who We Are" },
  { id: "data-we-collect", label: "2. Data We Collect" },
  { id: "how-we-use", label: "3. How We Use Your Data" },
  { id: "whatsapp", label: "4. WhatsApp & Email Messaging" },
  { id: "consent", label: "5. Consent & Opting Out" },
  { id: "sharing", label: "6. How We Share Data" },
  { id: "retention", label: "7. Data Retention" },
  { id: "security", label: "8. Security" },
  { id: "your-rights", label: "9. Your Rights" },
  { id: "deletion", label: "10. Deleting Your Data" },
  { id: "children", label: "11. Minors" },
  { id: "changes", label: "12. Changes to This Policy" },
  { id: "contact", label: "13. Contact Us" },
];

export default function PrivacyPage() {
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
                IAES International Education Fair
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
                Privacy Policy
              </h1>
              <p className="mt-3 text-sm text-navy/60">
                Version <strong>2026.1</strong> · Effective{" "}
                <strong>1 January 2026</strong> · Governed by the laws of the
                Republic of India.
              </p>
            </header>

            <p className="text-sm leading-relaxed">
              This Privacy Policy explains how{" "}
              <strong>Indo American Education Society</strong> (&ldquo;IAES&rdquo;,
              &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects,
              uses, shares, and protects personal information in connection with
              the IAES International Education Fairs and the website at{" "}
              <strong>fairs.iaesgujarat.org</strong> (the &ldquo;Service&rdquo;).
              By registering for an event or providing your contact details, you
              agree to the practices described here.
            </p>

            <Section id="who-we-are" title="1. Who We Are">
              <p>
                IAES is a nonprofit organisation registered under the Charitable
                Trust Act, 1950, with its registered office at 3rd Floor,
                301-302, Sun Square, Near Xavier&rsquo;s Corner, Off C G Road,
                Navarangpura, Ahmedabad &ndash; 380009, Gujarat, India. We
                organise education fairs that connect students with participating
                universities. For the purposes of applicable data-protection law,
                IAES is the data controller for the personal data described
                below.
              </p>
            </Section>

            <Section id="data-we-collect" title="2. Data We Collect">
              <p>We collect the following categories of personal data:</p>
              <ul>
                <li>
                  <strong>Student registrants:</strong> name, email address,
                  phone/WhatsApp number, city, intended field/level of study, and
                  the consent preferences you select at registration.
                </li>
                <li>
                  <strong>University &amp; institution representatives:</strong>{" "}
                  name, job title, work email, phone/WhatsApp number, institution
                  name and country, and booking/billing details needed to invoice
                  participation.
                </li>
                <li>
                  <strong>At-fair interactions:</strong> when a student&rsquo;s
                  event pass QR code is scanned by a university at the fair, that
                  scan is recorded so the student can be followed up with by that
                  university (subject to the student&rsquo;s consent flags).
                </li>
                <li>
                  <strong>Technical data:</strong> standard server logs and, where
                  applicable, delivery/read status of messages we send you.
                </li>
              </ul>
            </Section>

            <Section id="how-we-use" title="3. How We Use Your Data">
              <p>We use personal data to:</p>
              <ul>
                <li>Register you for an event and issue your entry pass.</li>
                <li>
                  Send you confirmations, passes, event details, schedule
                  updates, and reminders by email and &mdash; where you have
                  opted in &mdash; WhatsApp.
                </li>
                <li>
                  Tell you about future IAES education fairs that may be relevant
                  to you, where you have consented to ongoing contact.
                </li>
                <li>
                  Facilitate legitimate follow-up by participating universities
                  for students who consent to share their details.
                </li>
                <li>
                  Issue invoices, meet tax/accounting obligations, and operate and
                  secure the Service.
                </li>
              </ul>
            </Section>

            <Section id="whatsapp" title="4. WhatsApp & Email Messaging">
              <p>
                4.1 Email is our primary channel and is sent to the address you
                provide so we can deliver your registration confirmation, pass,
                and essential event information.
              </p>
              <p>
                4.2 <strong>WhatsApp is optional.</strong> We only send WhatsApp
                messages to a number when you have explicitly opted in during
                registration. WhatsApp messages are sent via the WhatsApp Business
                Platform (Meta). Message content is limited to your event pass,
                registration confirmation, event updates, and notices about future
                IAES fairs.
              </p>
              <p>
                4.3 We may store the delivery status of messages we send (for
                example, delivered/read/failed) to maintain a reliable contact log
                and to honour your opt-out choices.
              </p>
              <p>
                4.4 WhatsApp messaging is governed additionally by{" "}
                <a
                  href="https://www.whatsapp.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp&rsquo;s own Privacy Policy
                </a>
                . We do not control WhatsApp&rsquo;s processing of message
                metadata.
              </p>
            </Section>

            <Section id="consent" title="5. Consent & Opting Out">
              <p>
                5.1 You choose your communication preferences at registration. You
                can withdraw consent at any time, and doing so will not affect the
                event services you have already registered for.
              </p>
              <p>
                5.2 <strong>To stop WhatsApp messages:</strong> reply{" "}
                <strong>STOP</strong> (or &ldquo;UNSUBSCRIBE&rdquo;) to any
                WhatsApp message we send you. We will mark your number as
                unsubscribed and stop sending. You can also email us (see Section
                13).
              </p>
              <p>
                5.3 <strong>To stop emails:</strong> use the unsubscribe option in
                the email, or contact us.
              </p>
            </Section>

            <Section id="sharing" title="6. How We Share Data">
              <p>
                6.1 <strong>With participating universities:</strong> if you are a
                student and you consent to share your contact details, the
                universities whose stalls you visit (and whose representatives
                scan your pass) may receive your name, email, and &mdash; only if
                you consented to WhatsApp/phone sharing &mdash; your phone number,
                for the purpose of legitimate admissions and education advisory
                follow-up. Universities are contractually required not to sell or
                onward-transfer your data.
              </p>
              <p>
                6.2 <strong>With service providers:</strong> we use trusted
                processors to operate the Service &mdash; including email delivery,
                WhatsApp Business Platform (Meta), database/hosting infrastructure,
                and payment processing. They act on our instructions and only to
                the extent necessary to provide their service.
              </p>
              <p>
                6.3 <strong>For legal reasons:</strong> we may disclose data where
                required by law, regulation, or valid legal process.
              </p>
              <p>
                6.4 We do <strong>not</strong> sell your personal data.
              </p>
            </Section>

            <Section id="retention" title="7. Data Retention">
              <p>
                We retain personal data for as long as needed to provide the
                Service, to keep you informed about future fairs where you have
                consented, and to meet legal, tax, and accounting obligations.
                When data is no longer required for these purposes, we delete or
                anonymise it. You may request earlier deletion as described in
                Section 10.
              </p>
            </Section>

            <Section id="security" title="8. Security">
              <p>
                We apply reasonable technical and organisational measures to
                protect personal data, including access controls, encryption in
                transit, and row-level database access restrictions. No system is
                perfectly secure, but we work to safeguard your information and to
                limit access to those who need it to operate the Service.
              </p>
            </Section>

            <Section id="your-rights" title="9. Your Rights">
              <p>
                Subject to applicable law, you may request to access, correct,
                update, or delete your personal data, and to withdraw consent for
                marketing or WhatsApp/email communications. To exercise these
                rights, contact us using the details in Section 13. We will
                respond within a reasonable period.
              </p>
            </Section>

            <Section id="deletion" title="10. Deleting Your Data">
              <div className="not-prose my-4 rounded-md border border-navy/15 bg-cream/60 p-4 text-sm text-navy/85">
                <p>
                  You can request deletion of your personal data &mdash; including
                  your WhatsApp number and registration records &mdash; at any
                  time. See our dedicated{" "}
                  <Link
                    href="/data-deletion"
                    className="font-semibold text-navy underline hover:text-gold-600"
                  >
                    Data Deletion Instructions
                  </Link>{" "}
                  page, or email{" "}
                  <a
                    href="mailto:eduadviser@iaesgujarat.org"
                    className="font-semibold text-navy underline hover:text-gold-600"
                  >
                    eduadviser@iaesgujarat.org
                  </a>{" "}
                  with the subject line &ldquo;Data Deletion Request&rdquo;.
                </p>
              </div>
            </Section>

            <Section id="children" title="11. Minors">
              <p>
                The Service is intended for prospective higher-education students
                and institutional representatives. We do not knowingly collect
                data from children under 13. If you believe a child has provided
                us data, contact us and we will delete it.
              </p>
            </Section>

            <Section id="changes" title="12. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. Material
                changes will be reflected by a new version number and effective
                date on this page. Continued use of the Service after an update
                constitutes acceptance of the revised policy.
              </p>
            </Section>

            <Section id="contact" title="13. Contact Us">
              <p>
                For any privacy question or to exercise your rights, contact our
                education adviser team:
              </p>
            </Section>

            <div className="mt-12 border-t border-navy/10 pt-6 text-xs text-navy/60">
              <p>
                <strong>Indo American Education Society</strong>
                <br />
                3rd Floor, 301-302, Sun Square, Near Xavier&rsquo;s Corner,
                Off C G Road,
                <br />
                Navarangpura, Ahmedabad &ndash; 380009, Gujarat, India
                <br />
                GSTIN: 24AAATI2674J1ZM · PAN: AAATI2674J
                <br />
                eduadviser@iaesgujarat.org · +91 97264 80899
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link
                  href="/"
                  className="inline-block text-navy hover:text-gold-600"
                >
                  &larr; Back to home
                </Link>
                <Link
                  href="/terms"
                  className="inline-block text-navy hover:text-gold-600"
                >
                  Terms &amp; Conditions
                </Link>
                <Link
                  href="/data-deletion"
                  className="inline-block text-navy hover:text-gold-600"
                >
                  Data Deletion
                </Link>
              </div>
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
