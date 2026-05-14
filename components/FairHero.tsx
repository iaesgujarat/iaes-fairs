import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import type { Fair } from "@/types";
import { formatDate } from "@/lib/utils";

export function FairHero({ fair }: { fair: Fair }) {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-gold blur-3xl" />
        <div className="absolute -right-32 -bottom-10 h-96 w-96 rounded-full bg-gold/60 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <p className="mb-3 text-xs uppercase tracking-[0.24em] text-gold">
          Official EducationUSA Fair
        </p>
        <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl md:text-6xl">
          {fair.name}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
          {fair.description ||
            "Connecting U.S. universities with the brightest students from across Gujarat and Western India."}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/90">
          <span className="inline-flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gold" />
            {formatDate(fair.fair_date)}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gold" />
            {fair.venue || fair.city}
          </span>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-md bg-gold px-7 py-3.5 text-sm font-semibold text-navy shadow-card transition-colors hover:bg-gold-300"
          >
            Register Your University
            <span aria-hidden>&rarr;</span>
          </Link>
          <a
            href="#fair-details"
            className="inline-flex items-center gap-2 rounded-md border border-white/20 px-7 py-3.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/5"
          >
            View Fair Details
          </a>
        </div>
      </div>
    </section>
  );
}
