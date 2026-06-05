import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Data Deletion Instructions — IAES International Education Fair",
  description:
    "How to request deletion of your personal data, including your WhatsApp number and registration records, from the Indo American Education Society.",
  robots: "index, follow",
};

export default function DataDeletionPage() {
  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <article className="prose prose-navy max-w-none text-navy/85">
          <header className="not-prose mb-8 border-b border-navy/10 pb-6">
            <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
              IAES International Education Fair
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
              Data Deletion Instructions
            </h1>
            <p className="mt-3 text-sm text-navy/60">
              Effective <strong>1 January 2026</strong>
            </p>
          </header>

          <p className="text-sm leading-relaxed">
            The <strong>Indo American Education Society</strong> (&ldquo;IAES&rdquo;)
            respects your right to control your personal data. You may request
            the deletion of your personal information &mdash; including your name,
            email address, phone/WhatsApp number, and event registration records
            &mdash; held in connection with the IAES International Education Fairs
            and the website at <strong>fairs.iaesgujarat.org</strong>.
          </p>

          <Section title="Option 1 — Stop WhatsApp messages instantly">
            <p>
              To stop receiving WhatsApp messages immediately, reply{" "}
              <strong>STOP</strong> (or <strong>UNSUBSCRIBE</strong>) to any
              WhatsApp message we have sent you. Your number is marked as
              unsubscribed and we stop sending. This halts messaging right away;
              to also have your stored data erased, use Option 2.
            </p>
          </Section>

          <Section title="Option 2 — Request full deletion by email">
            <p>
              Send an email to{" "}
              <a
                href="mailto:eduadviser@iaesgujarat.org?subject=Data%20Deletion%20Request"
                className="font-semibold text-navy underline hover:text-gold-600"
              >
                eduadviser@iaesgujarat.org
              </a>{" "}
              with the subject line <strong>&ldquo;Data Deletion Request&rdquo;</strong>{" "}
              and include:
            </p>
            <ul>
              <li>The name you registered with.</li>
              <li>
                The email address and/or phone number associated with your
                registration (so we can locate your records).
              </li>
            </ul>
            <p>
              We will verify the request, delete or anonymise your personal data,
              and confirm completion. We aim to action verified requests within{" "}
              <strong>30 days</strong>.
            </p>
          </Section>

          <Section title="What gets deleted">
            <p>
              On a verified request we remove your contact and registration
              details from our active systems, including your entry in the
              WhatsApp contact registry. Please note we may retain a minimal
              record where we are legally required to (for example, invoice and
              tax records), and we will not use such retained data to contact you.
            </p>
          </Section>

          <Section title="Data held by participating universities">
            <p>
              If you are a student who consented to share your details with a
              university at a fair, that university holds its own copy of your
              data as an independent controller. Deleting your data from IAES does
              not remove it from a university&rsquo;s systems &mdash; please
              contact the relevant university directly for that.
            </p>
          </Section>

          <div className="mt-12 border-t border-navy/10 pt-6 text-xs text-navy/60">
            <p>
              <strong>Indo American Education Society</strong>
              <br />
              3rd Floor, 301-302, Sun Square, Navarangpura, Ahmedabad &ndash;
              380009, Gujarat, India
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
                href="/privacy"
                className="inline-block text-navy hover:text-gold-600"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="inline-block text-navy hover:text-gold-600"
              >
                Terms &amp; Conditions
              </Link>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-20">
      <h2 className="mt-10 font-serif text-2xl font-semibold text-navy">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
