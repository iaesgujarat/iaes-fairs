import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SignOutButton } from "@/components/SignOutButton";
import { SendActionButton } from "@/components/SendActionButton";
import { formatFairDateRange, formatDateLong } from "@/lib/mailerHelpers";
import type { Fair } from "@/types";

export const dynamic = "force-dynamic";

export default async function AnnouncePage({
  params,
}: {
  params: { fairId: string };
}) {
  const session = await createClient().auth.getUser();
  const userEmail = session.data.user?.email || "Admin";

  const supabase = createAdminClient();
  const [{ data: fair }, { count: activeCount }, { count: sentCount }] =
    await Promise.all([
      supabase.from("fairs").select("*").eq("id", params.fairId).maybeSingle(),
      supabase
        .from("announcement_recipients")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("announcement_sends")
        .select("*", { count: "exact", head: true })
        .eq("fair_id", params.fairId)
        .eq("email_type", "ANNOUNCEMENT"),
    ]);

  if (!fair) notFound();
  const f = fair as Fair;

  const activeRecipients = activeCount ?? 0;
  const previousAnnouncementCount = sentCount ?? 0;
  const remainingCount = Math.max(activeRecipients - previousAnnouncementCount, 0);

  return (
    <>
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-6">
            <Link href="/admin/dashboard" className="flex items-baseline gap-2">
              <span className="font-serif text-xl font-semibold text-navy">
                IAES
              </span>
              <span className="text-xs uppercase tracking-[0.18em] text-gold-500">
                Admin
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/admin/dashboard"
                className="text-navy/65 hover:text-navy"
              >
                Registrations
              </Link>
              <Link
                href="/admin/fairs"
                className="text-navy/65 hover:text-navy"
              >
                Fairs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-navy/70">{userEmail}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-2">
          <Link
            href={`/admin/fairs/${f.id}`}
            className="text-sm text-navy/55 hover:text-navy"
          >
            &larr; Back to {f.name}
          </Link>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-navy">
          Send Announcement
        </h1>
        <p className="mt-1 text-sm text-navy/60">
          Email the mailing list to announce that registration is now open.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Active recipients" value={activeRecipients.toString()} />
          <Stat
            label="Already announced"
            value={previousAnnouncementCount.toString()}
          />
          <Stat
            label="Will send to"
            value={remainingCount.toString()}
            accent="navy"
          />
        </div>

        <div className="mt-8 rounded-lg border border-navy/10 bg-white p-6 shadow-card">
          <p className="text-xs uppercase tracking-wider text-navy/55">
            Email preview
          </p>
          <div className="mt-3 space-y-3 rounded-md border border-navy/10 bg-cream/40 p-4 text-sm text-navy/85">
            <p className="font-semibold text-navy">
              Subject: Registration now open — {f.name}
            </p>
            <p>
              Dear [Recipient Name], we are pleased to announce the {f.name}.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-navy/70">
              <li>Dates: {formatFairDateRange(f)}</li>
              <li>City: {f.city}</li>
              <li>
                Registration fee:{" "}
                {f.price_earlybird_usd ? (
                  <>
                    Early Bird USD {Number(f.price_earlybird_usd).toLocaleString()}
                    {" "}— ends {formatDateLong(f.earlybird_deadline)} · Standard
                    USD{" "}
                    {Number(
                      f.price_standard_usd ?? f.booth_price_usd ?? 0
                    ).toLocaleString()}
                  </>
                ) : (
                  <>
                    USD{" "}
                    {Number(
                      f.price_standard_usd ?? f.booth_price_usd ?? 0
                    ).toLocaleString()}
                  </>
                )}
              </li>
              <li>
                Registration closes {formatDateLong(f.registration_deadline)}
              </li>
            </ul>
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-amber-800">
              ⚠️ This will send emails to {remainingCount} recipient
              {remainingCount === 1 ? "" : "s"}. Duplicate sends to the same
              recipient are prevented automatically.
            </p>
            <div className="mt-4">
              <SendActionButton
                path={`/api/admin/fairs/${f.id}/announce`}
                label={`Send to ${remainingCount} ${remainingCount === 1 ? "recipient" : "recipients"} →`}
                confirmText={`Send the announcement to ${remainingCount} recipient${remainingCount === 1 ? "" : "s"}?`}
              />
            </div>
          </div>
        </div>

        {f.announced_at && (
          <p className="mt-6 text-xs text-navy/55">
            Last announcement broadcast: {formatDateLong(f.announced_at)}
          </p>
        )}
      </main>

      <SiteFooter />
    </>
  );
}

function Stat({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "navy";
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
      <div className={`h-1 ${accent === "navy" ? "bg-gold" : "bg-navy/30"}`} />
      <div className="p-5">
        <p className="text-xs uppercase tracking-wider text-navy/55">{label}</p>
        <p className="mt-2 font-serif text-2xl font-semibold text-navy">
          {value}
        </p>
      </div>
    </div>
  );
}
