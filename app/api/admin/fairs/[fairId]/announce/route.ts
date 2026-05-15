import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { FairAnnouncementEmail } from "@/emails/FairAnnouncementEmail";
import {
  appUrl,
  formatFairDateRange,
  formatDateLong,
  TEST_RECIPIENT,
} from "@/lib/mailerHelpers";
import type { Fair, AnnouncementRecipient } from "@/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  testOnly: z.boolean().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: { fairId: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Resend is not configured." },
      { status: 503 }
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* default */
  }
  const { testOnly } = bodySchema.parse(body);

  const supabase = createAdminClient();
  const { data: fair } = await supabase
    .from("fairs")
    .select("*")
    .eq("id", params.fairId)
    .maybeSingle();
  if (!fair) {
    return NextResponse.json({ error: "Fair not found." }, { status: 404 });
  }
  const f = fair as Fair;

  // Build the email content for this fair once
  const renderProps = {
    fairName: f.name,
    fairDateRange: formatFairDateRange(f),
    city: f.city,
    standardUSD: Number(f.price_standard_usd ?? f.booth_price_usd ?? 0),
    earlybirdUSD: f.price_earlybird_usd ? Number(f.price_earlybird_usd) : null,
    earlybirdDeadline: formatDateLong(f.earlybird_deadline),
    registrationDeadline: formatDateLong(f.registration_deadline),
    registerUrl: `${appUrl()}/register/university`,
  };

  const resend = getResend();

  if (testOnly) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TEST_RECIPIENT,
      subject: `[TEST] Registration now open — ${f.name}`,
      react: FairAnnouncementEmail({
        recipientName: "Test User",
        ...renderProps,
      }),
    });
    return NextResponse.json({ ok: true, sent: 1, testOnly: true });
  }

  // Recipients: active rows that haven't already received ANNOUNCEMENT for this fair
  const { data: recipientsRaw } = await supabase
    .from("announcement_recipients")
    .select("*")
    .eq("is_active", true);
  const recipients = (recipientsRaw as AnnouncementRecipient[] | null) || [];

  const { data: sentRows } = await supabase
    .from("announcement_sends")
    .select("recipient_id")
    .eq("fair_id", f.id)
    .eq("email_type", "ANNOUNCEMENT");
  const alreadySent = new Set((sentRows || []).map((r) => r.recipient_id));

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const failures: { email: string; error: string }[] = [];

  for (const rec of recipients) {
    if (alreadySent.has(rec.id)) {
      skipped += 1;
      continue;
    }
    try {
      const res = await resend.emails.send({
        from: FROM_EMAIL,
        to: rec.email,
        subject: `Registration now open — ${f.name}`,
        react: FairAnnouncementEmail({
          recipientName: rec.name,
          ...renderProps,
        }),
      });
      const emailId =
        (res as { data?: { id?: string } }).data?.id ?? null;
      await supabase.from("announcement_sends").insert({
        fair_id: f.id,
        recipient_id: rec.id,
        email_type: "ANNOUNCEMENT",
        resend_email_id: emailId,
      });
      sent += 1;
    } catch (e) {
      failed += 1;
      failures.push({
        email: rec.email,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  // Stamp announced_at on the fair if at least one send succeeded
  if (sent > 0) {
    await supabase
      .from("fairs")
      .update({ announced_at: new Date().toISOString() })
      .eq("id", f.id);
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    failed,
    failures: failures.slice(0, 20),
  });
}
