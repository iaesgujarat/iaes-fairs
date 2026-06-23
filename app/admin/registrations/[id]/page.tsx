import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SignOutButton } from "@/components/SignOutButton";
import { PremiumLogoManager } from "@/components/PremiumLogoManager";
import { EventOptinEditor } from "@/components/EventOptinEditor";
import { RegistrationAdminControls } from "@/components/admin/RegistrationAdminControls";
import { BoothLinks } from "@/components/admin/BoothLinks";
import { appUrl } from "@/lib/mailerHelpers";
import { formatUSD, formatDateShort } from "@/lib/utils";
import type { FairItineraryStop, BillingDetails } from "@/types";

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
      `id, fair_id, university_name, university_country, university_website,
       contact_name, contact_title, contact_email, contact_phone,
       payment_currency, pricing_tier, total_tables, total_reps, status,
       bill_to_attn_name, bill_to_attn_title, bill_to_attn_email, bill_to_cc,
       backdrop_received, backdrop_received_at, backdrop_png_url,
       logo_reminder_sent_at, created_at,
       fair:fairs(name, premium_deadline, price_premium_usd),
       invoices(proforma_reference, total_amount_usd, status, invoice_type),
       billing:billing_details(*)`
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!reg) notFound();

  const fair = Array.isArray(reg.fair) ? reg.fair[0] : reg.fair;
  const invoice = Array.isArray(reg.invoices) ? reg.invoices[0] : null;
  const billing = (Array.isArray(reg.billing)
    ? reg.billing[0]
    : reg.billing) as BillingDetails | null;
  const isPremium = reg.pricing_tier === "PREMIUM";

  // v19/v22 — billing recipient state for the admin controls. Locked
  // ONLY once money is actually received (a paid TAX invoice). A bare
  // "confirmed" (an admin can soft-confirm to hold a spot before
  // payment) keeps the recipient editable.
  const invoiceRows = (Array.isArray(reg.invoices) ? reg.invoices : []) as Array<{
    invoice_type?: string;
    status?: string;
  }>;
  const hasPaidTaxInvoice = invoiceRows.some(
    (i) => i.invoice_type === "TAX" && i.status === "paid"
  );
  const isLocked = reg.status === "paid" || hasPaidTaxInvoice;
  const currentMode: "university" | "india_office" =
    reg.payment_currency === "INR" && billing ? "india_office" : "university";
  const attn = reg.bill_to_attn_name
    ? {
        name: reg.bill_to_attn_name as string,
        title: (reg.bill_to_attn_title as string) ?? "",
        email: (reg.bill_to_attn_email as string) ?? "",
        cc: !!reg.bill_to_cc,
      }
    : null;

  // v15 — event opt-in (any tier): public stops + this reg's picks.
  const { data: stopRows } = await supabase
    .from("fair_itinerary")
    .select("*")
    .eq("fair_id", reg.fair_id)
    .eq("is_public", true)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true });
  const stops = (stopRows as FairItineraryStop[] | null) ?? [];
  const { data: optRows } = await supabase
    .from("registration_event_optin")
    .select("itinerary_stop_id")
    .eq("registration_id", reg.id);
  const optedIds = (optRows ?? []).map(
    (o) => o.itinerary_stop_id as string
  );

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

        <div className="mt-8 space-y-6">
          {/* Event attendance — all tiers (v15) */}
          <div className="rounded-lg border border-navy/10 bg-white p-5 shadow-card">
            <p className="text-xs uppercase tracking-wider text-navy/55">
              Event attendance
            </p>
            <p className="mb-3 mt-1 text-xs text-navy/50">
              Itinerary stops this university will attend — for travel /
              meal / headcount planning.
            </p>
            <EventOptinEditor
              registrationId={reg.id}
              stops={stops}
              initialSelectedIds={optedIds}
            />
          </div>

          <BoothLinks
            scanUrl={`${appUrl()}/scan?b=${reg.id}`}
            portalUrl={`${appUrl()}/portal/${reg.id}/students`}
          />

          <RegistrationAdminControls
            registrationId={reg.id}
            isLocked={isLocked}
            status={reg.status as string}
            details={{
              university_name: (reg.university_name as string) ?? "",
              university_country: (reg.university_country as string) ?? "",
              university_website: (reg.university_website as string) ?? "",
              contact_name: (reg.contact_name as string) ?? "",
              contact_title: (reg.contact_title as string) ?? "",
              contact_email: (reg.contact_email as string) ?? "",
              contact_phone: (reg.contact_phone as string) ?? "",
            }}
            currentMode={currentMode}
            attn={attn}
            billing={
              billing
                ? {
                    legal_name: billing.legal_name ?? "",
                    billing_address: billing.billing_address ?? "",
                    city: billing.city ?? "",
                    state: billing.state ?? "",
                    pin_code: billing.pin_code ?? "",
                    pan_number: billing.pan_number ?? "",
                    is_gst_registered: !!billing.is_gst_registered,
                    gstin: billing.gstin ?? "",
                    authorization_note: billing.authorization_note ?? "",
                  }
                : null
            }
          />

          {isPremium && (
            <>
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
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
