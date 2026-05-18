import Link from "next/link";
import { IAES_LOGO_PATH, IAES_LOGO_ALT } from "@/lib/brand";

export function SiteHeader({ variant = "navy" }: { variant?: "navy" | "light" }) {
  const isNavy = variant === "navy";
  return (
    <header
      className={
        isNavy
          ? "border-b border-white/10 bg-navy text-white"
          : "border-b border-navy/10 bg-white text-navy"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-3">
          <img
            src={IAES_LOGO_PATH}
            alt={IAES_LOGO_ALT}
            width={44}
            height={44}
            className="h-11 w-11 rounded-full object-cover ring-1 ring-black/5"
          />
          <span
            className={
              isNavy
                ? "text-sm uppercase tracking-[0.18em] text-gold"
                : "text-sm uppercase tracking-[0.18em] text-gold-500"
            }
          >
            IAES International Education Fairs
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm sm:flex">
          <Link
            href="/"
            className={isNavy ? "hover:text-gold" : "hover:text-navy-600"}
          >
            Fair Details
          </Link>
          <Link
            href="/#register"
            className={isNavy ? "hover:text-gold" : "hover:text-navy-600"}
          >
            Register
          </Link>
          <Link
            href="/admin/login"
            className={
              isNavy
                ? "text-white/70 hover:text-gold"
                : "text-navy/60 hover:text-navy"
            }
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
