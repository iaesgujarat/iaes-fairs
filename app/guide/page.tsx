import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Collecting Student Leads — University Guide | IAES Fairs",
  description:
    "How university representatives scan student QR passes to capture leads at the IAES International Education Fair, and how to retrieve them afterward.",
  robots: "index, follow",
};

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative pl-14">
      <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
        {n}
      </span>
      <h2 className="font-serif text-2xl font-semibold text-navy">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-navy/85">
        {children}
      </div>
    </section>
  );
}

export default function GuidePage() {
  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <header className="border-b border-navy/10 pb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
            University Representative Guide
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
            Collecting student leads at the fair
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-navy/70">
            Every student at the fair carries a unique <strong>QR pass</strong>.
            When you scan it at your booth, the student&rsquo;s profile is saved
            to your university&rsquo;s lead list automatically. No spreadsheets,
            no manual typing. Here&rsquo;s the whole process.
          </p>
        </header>

        <div className="mt-10 space-y-10">
          <Step n={1} title="Open your booth scanner">
            <p>
              On your phone, open the <strong>booth scanner link</strong> IAES
              emailed you — it logs your booth in automatically, so you can start
              scanning right away.
            </p>
            <p className="rounded-md border border-navy/10 bg-cream/50 p-3 text-xs text-navy/70">
              <strong>No link handy?</strong> Open{" "}
              <span className="font-mono">fairs.iaesgujarat.org/scan</span> and
              enter your <strong>invoice number</strong> once — we&rsquo;ll
              remember your booth on that phone.
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                Tap <strong>Allow</strong> when the browser asks for camera
                permission.
              </li>
              <li>
                Optionally tap <strong>Add to Home Screen</strong> so it opens
                like an app.
              </li>
              <li>
                Several reps at one booth? Each opens the{" "}
                <strong>same link</strong> on their own phone — all scans pool
                into your university&rsquo;s list.
              </li>
            </ul>
            <p className="text-xs text-navy/55">
              Please scan from inside this page — scanning a student&rsquo;s QR
              with a generic camera app won&rsquo;t record it to your booth.
            </p>
          </Step>

          <Step n={2} title="Scan each student you meet">
            <p>
              Point your camera at the student&rsquo;s QR pass (on their phone or
              printed). Their profile appears instantly. You can:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Review their field of interest, budget, and target countries.</li>
              <li>
                Add a quick <strong>note</strong> (e.g. &ldquo;strong fit —
                follow up on scholarship&rdquo;).
              </li>
              <li>
                Tick <strong>Interested</strong> to flag the best prospects.
              </li>
              <li>
                Tap <strong>Save Contact</strong>. A green tick confirms it, and
                your &ldquo;contacts saved&rdquo; count goes up.
              </li>
            </ul>
          </Step>

          <Step n={3} title="Get your leads — during &amp; after the fair">
            <p>
              Open your private <strong>leads portal</strong> link (also in your
              email) and enter the <strong>last 4 digits</strong> of the phone
              number you registered with. You&rsquo;ll see every student you
              scanned, searchable, with a one-click <strong>CSV download</strong>.
            </p>
            <p className="text-xs text-navy/55">
              Your portal stays open for <strong>30 days</strong> after the fair.
            </p>
          </Step>
        </div>

        <div className="mt-12 rounded-lg border border-gold/30 bg-gold/5 p-5 text-sm leading-relaxed text-navy/85">
          <p className="font-semibold text-navy">A note on student consent</p>
          <p className="mt-2">
            You&rsquo;ll only ever receive the details each student agreed to
            share. A student&rsquo;s phone or email appears only where they opted
            in, and students who chose not to share contact details are not
            included in your list. This keeps the fair trusted by students and
            compliant for everyone.
          </p>
        </div>

        <div className="mt-10 border-t border-navy/10 pt-6 text-sm text-navy/70">
          <p>
            Questions on the day? Find any IAES staff member, or write to{" "}
            <a
              href="mailto:eduadviser@iaesgujarat.org"
              className="font-medium text-navy underline"
            >
              eduadviser@iaesgujarat.org
            </a>
            .
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-navy hover:text-gold-600"
          >
            &larr; Back to home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
