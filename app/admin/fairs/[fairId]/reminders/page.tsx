import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SignOutButton } from "@/components/SignOutButton";
import { SendActionButton } from "@/components/SendActionButton";
import { formatDateLong } from "@/lib/mailerHelpers";
import type { Fair, AnnouncementEmailType } from "@/types";

export const dynamic = "force-dynamic";

interface ReminderStat {
  type: AnnouncementEmailType;
  sentCount: number;
  lastSentAt: string | null;
}

export default async function RemindersPage({
  params,
}: {
  params: { fairId: string };
}) {
  const session = await createClient().auth.getUser();
  const userEmail = session.data.user?.email || "Admin";

  const supabase = createAdminClient();
  const [
    { data: fair },
    { data: sentRows },
    { count: activeMailing },
    { count: confirmedRegs },
    { count: unpaidRegs },
  ] = await Promise.all([
    supabase.from("fairs").select("*").eq("id", params.fairId).maybeSingle(),
    supabase
      .from("announcement_sends")
      .select("email_type, sent_at")
      .eq("fair_id", params.fairId)
      .in("email_type", [
        "EARLYBIRD_REMINDER",
        "REGISTRATION_REMINDER",
        "ITINERARY",
        "PAYMENT_REMINDER",
      ]),
    supabase
      .from("announcement_recipients")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("fair_id", params.fairId)
      .in("status", ["confirmed", "paid"]),
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("fair_id", params.fairId)
      .in("status", ["pending", "invoice_sent"]),
  ]);

  if (!fair) notFound();
  const f = fair as Fair;

  const stats = new Map<AnnouncementEmailType, ReminderStat>();
  for (const r of (sentRows || []) as {
    email_type: AnnouncementEmailType;
    sent_at: string;
  }[]) {
    const cur = stats.get(r.email_type) ?? {
      type: r.email_type,
      sentCount: 0,
      lastSentAt: null,
    };
    cur.sentCount += 1;
    if (!cur.lastSentAt || r.sent_at > cur.lastSentAt) {
      cur.lastSentAt = r.sent_at;
    }
    stats.set(r.email_type, cur);
  }
  function statFor(t: AnnouncementEmailType): ReminderStat {
    return stats.get(t) ?? { type: t, sentCount: 0, lastSentAt: null };
  }

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
          Pre-Fair Reminders
        </h1>
        <p className="mt-1 text-sm text-navy/60">
          Each send is deduplicated per recipient — re-running won&rsquo;t
          double-email anyone.
        </p>

        <div className="mt-8 space-y-5">
          <ReminderCard
            index={1}
            title="Early Bird Reminder"
            description={
              f.earlybird_deadline
                ? `Send 7 days before early-bird ends (${formatDateLong(
                    f.earlybird_deadline
                  )}). Goes to all ${activeMailing ?? 0} active mailing-list contacts.`
                : "No early-bird tier configured. Skip this reminder."
            }
            stat={statFor("EARLYBIRD_REMINDER")}
          >
            <SendActionButton
              path={`/api/admin/fairs/${f.id}/reminders`}
              body={{ type: "EARLYBIRD_REMINDER" }}
              label="Send early bird reminder →"
            />
          </ReminderCard>

          <ReminderCard
            index={2}
            title="Registration Deadline Reminder"
            description={
              f.registration_deadline
                ? `Send 14 days before deadline (${formatDateLong(
                    f.registration_deadline
                  )}). Goes to all ${activeMailing ?? 0} active mailing-list contacts.`
                : "Set a registration deadline on the fair first."
            }
            stat={statFor("REGISTRATION_REMINDER")}
          >
            <SendActionButton
              path={`/api/admin/fairs/${f.id}/reminders`}
              body={{ type: "REGISTRATION_REMINDER" }}
              label="Send registration reminder →"
            />
          </ReminderCard>

          <ReminderCard
            index={3}
            title="Itinerary & Briefing Pack"
            description={`Send 4 weeks before the fair, only to ${
              confirmedRegs ?? 0
            } confirmed registration${
              confirmedRegs === 1 ? "" : "s"
            }.`}
            stat={statFor("ITINERARY")}
          >
            <SendActionButton
              path={`/api/admin/fairs/${f.id}/reminders`}
              body={{ type: "ITINERARY" }}
              label="Send itinerary →"
            />
          </ReminderCard>

          <ReminderCard
            index={4}
            title="Payment Reminders"
            description={`Email ${
              unpaidRegs ?? 0
            } unpaid registration${
              unpaidRegs === 1 ? "" : "s"
            } with their Pay link.`}
            stat={statFor("PAYMENT_REMINDER")}
          >
            <SendActionButton
              path={`/api/admin/fairs/${f.id}/reminders`}
              body={{ type: "PAYMENT_REMINDER" }}
              label={`Send to ${unpaidRegs ?? 0} unpaid →`}
            />
          </ReminderCard>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function ReminderCard({
  index,
  title,
  description,
  stat,
  children,
}: {
  index: number;
  title: string;
  description: string;
  stat: ReminderStat;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-navy/10 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-navy/55">
            #{index}
          </p>
          <p className="font-serif text-lg font-semibold text-navy">{title}</p>
          <p className="mt-0.5 text-sm text-navy/70">{description}</p>
          {stat.sentCount > 0 ? (
            <p className="mt-2 text-xs text-emerald-700">
              ✓ Sent to {stat.sentCount} recipient
              {stat.sentCount === 1 ? "" : "s"} ·{" "}
              {stat.lastSentAt
                ? new Date(stat.lastSentAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </p>
          ) : (
            <p className="mt-2 text-xs text-navy/45">Not sent yet.</p>
          )}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
