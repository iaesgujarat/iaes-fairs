import Link from "next/link";

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
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-serif text-2xl font-semibold tracking-tight">
            IAES
          </span>
          <span
            className={
              isNavy
                ? "text-sm uppercase tracking-[0.18em] text-gold"
                : "text-sm uppercase tracking-[0.18em] text-gold-500"
            }
          >
            EducationUSA Fairs
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
