import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteHeader variant="light" />
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-gold-500">404</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-navy sm:text-4xl">
          We couldn&rsquo;t find that page.
        </h1>
        <p className="mt-3 text-navy/70">
          The link may be broken or the registration may have been removed.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-md bg-navy px-6 py-3 text-sm font-medium text-white hover:bg-navy-600"
        >
          Return Home
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
