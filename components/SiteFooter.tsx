import Link from "next/link";
import { IAES_LOGO_PATH, IAES_LOGO_ALT } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-navy/10 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <img
              src={IAES_LOGO_PATH}
              alt={IAES_LOGO_ALT}
              width={56}
              height={56}
              className="h-14 w-14 rounded-full object-cover"
            />
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-gold-500">
              Indo American Education Society
            </p>
            <p className="mt-3 text-sm text-navy/70">
              Ahmedabad, Gujarat &mdash; A registered non-profit advancing
              U.S.&ndash;India education exchange.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-navy/60">
              Contact
            </p>
            <p className="mt-2 text-sm text-navy">
              <a
                href="mailto:eduadviser@iaesgujarat.org"
                className="hover:text-gold-500"
              >
                eduadviser@iaesgujarat.org
              </a>
            </p>
            <p className="text-sm text-navy">
              <a href="tel:+919825593262" className="hover:text-gold-500">
                +91 98255 93262
              </a>
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-navy/60">
              Office
            </p>
            <p className="mt-2 text-sm text-navy/80">
              Indo American Education Society
              <br />
              3rd Floor, 301-302, Sun Square
              <br />
              Navarangpura, Ahmedabad - 380009
              <br />
              Gujarat, India
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-navy/10 pt-6 text-xs text-navy/50">
          <span>
            &copy; {new Date().getFullYear()} Indo American Education Society.
            All rights reserved. &middot; fairs.iaesgujarat.org
          </span>
          <Link
            href="/terms"
            className="text-navy/60 hover:text-navy hover:underline"
          >
            Terms &amp; Conditions
          </Link>
        </div>
      </div>
    </footer>
  );
}
