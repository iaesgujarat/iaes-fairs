import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SignOutButton } from "@/components/SignOutButton";
import { PremiumLogoManager } from "@/components/PremiumLogoManager";
import { formatUSD, formatDateShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Premium deliverables — informational checklist (operational tracking
// is manual; not persisted in v14).
const DELIVERABLES = [
  "Logo received",
  "Backdrop ordered / printed",
  "Print ad sent to designer",
  "Social media campaign briefed",
  "Vernacular volunteer assigned",
];

export default async function AdminRegistrationPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await createClient().auth.getUser();
  const userEmail = session.data.user?.email || "Admin";

  const supabase = createAdminClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select(
      `id, university_name, contact_name, contact_email, contact_phone,
       pricing_tier, total_tables, total_reps, status,
       backdrop_received, backdrop_received_at, backdrop_png_url,
       logo_reminder_sent_at, created_at,
       fair:fairs(name, premium_deadline, price_premium_usd),
       invoices(proforma_reference, total_amount_usd)`
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!reg) notFound();

  const fair = Array.isArray(reg.fair) ? reg.fair[0] : reg.fair;
  const invoice = Array.isArray(reg.invoices) ? reg.invoices[0] : null;
  const isPremium = reg.pricing_tier === "PREMIUM";

  return (
    <>
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/admin/dashboard" className="flex items-baseline gap-2">
            <span className="font-serif text-xl font-semibold text-navy">
              IAES
            </span>
            <span className="text-xs uppercase tracking-[0.18em] text-gold-500">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-navy/70">{userEmail}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/admin/dashboard"
          className="text-sm text-navy/55 hover:text-navy"
        >
          &larr; Registrations
        </Link>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-navy">
              {reg.university_name}
            </h1>
            <p className="mt-1 text-sm text-navy/65">
              {reg.contact_name} · {reg.contact_email}
              {reg.contact_phone ? ` · ${reg.contact_phone}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-navy/50">
              {fair?.name} · registered {formatDateShort(reg.created_at)}
            </p>
          </div>
          <span
            className={
              isPremium
                ? "rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy"
                : "rounded-full bg-navy/10 px-3 py-1 text-xs font-semibold text-navy"
            }
          >
            {isPremium ? "💎 PREMIUM" : reg.pricing_tier}
          </span>
        </div>

        {!isPremium ? (
          <div className="mt-8 rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            This is a {reg.pricing_tier} registration. Premium logo /
            backdrop tools apply only to premium booths. Manage it from the{" "}
            <Link
              href="/admin/dashboard"
              className="font-medium underline"
            >
              registrations dashboard
            </Link>
            .
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="rounded-lg border border-navy/10 bg-white p-5 shadow-card">
              <p className="text-xs uppercase tracking-wider text-navy/55">
                Premium booth
              </p>
              <div className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-navy/55">Package</p>
                  <p className="mt-0.5 font-medium text-navy">
                    {reg.total_tables ?? 2} tables · {reg.total_reps ?? 4}{" "}
                    reps
                  </p>
                </div>
                <div>
                  <p className="text-xs text-navy/55">Amount</p>
                  <p className="mt-0.5 font-medium text-navy">
                    {formatUSD(
                      Number(
                        invoice?.total_amount_usd ??
                          fair?.price_premium_usd ??
                          2500
                      )
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-navy/55">Proforma</p>
                  <p className="mt-0.5 font-medium text-navy">
                    {invoice?.proforma_reference ?? "—"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-navy/50">
                Logo deadline:{" "}
                {fair?.premium_deadline
                  ? formatDateShort(fair.premium_deadline)
                  : "—"}
                {reg.logo_reminder_sent_at
                  ? ` · last reminder ${formatDateShort(
                      reg.logo_reminder_sent_at.slice(0, 10)
                    )}`
                  : ""}
              </p>
            </div>

            <PremiumLogoManager
              registrationId={reg.id}
              backdropReceived={!!reg.backdrop_received}
              backdropUrl={reg.backdrop_png_url ?? null}
            />

            <div className="rounded-lg border border-navy/10 bg-white p-5 shadow-card">
              <p className="text-xs uppercase tracking-wider text-navy/55">
                Premium deliverables checklist
              </p>
              <ul className="mt-3 space-y-2 text-sm text-navy/80">
                {DELIVERABLES.map((d) => (
                  <li key={d} className="flex items-center gap-2">
                    <span
                      className={
                        d === "Logo received" && reg.backdrop_received
                          ? "text-emerald-600"
                          : "text-navy/30"
                      }
                      aria-hidden
                    >
                      {d === "Logo received" && reg.backdrop_received
                        ? "✓"
                        : "○"}
                    </span>
                    {d}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-navy/45">
                This checklist is for coordination only — not stored.
              </p>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
