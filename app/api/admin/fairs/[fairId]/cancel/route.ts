import { NextResponse } from "next/server";
import { z } from "zod";
import { runTransition } from "@/lib/fairTransitions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { FairCancellationEmail } from "@/emails/FairCancellationEmail";
import { formatDateLong } from "@/lib/mailerHelpers";
import type { Fair } from "@/types";

export const runtime = "nodejs";

const cancelBodySchema = z.object({
  reason: z.string().min(3, "Reason is required.").max(2000),
});

/**
 * Compute a refund hint per T&C §7 (cancellation tiers). Used to make
 * the cancellation email concrete for the recipient.
 */
function refundHint(fair: Fair): string {
  const start = fair.fair_date_start || fair.fair_date;
  if (!start) {
    return "Refund per cancellation policy (T&C §7).";
  }
  const daysUntil = Math.ceil(
    (new Date(start).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntil >= 60) return "Refund: 75% of base fee (T&C §7.4).";
  if (daysUntil >= 30) return "Refund: 50% of base fee (T&C §7.4).";
  if (daysUntil >= 15) return "Refund: 25% of base fee (T&C §7.4).";
  return "Refund: 0% — within 15 days of the fair (T&C §7.4).";
}

export async function POST(
  req: Request,
  { params }: { params: { fairId: string } }
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = cancelBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Reason is required to cancel a fair.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  // 1. Transition the fair → CANCELLED. This also runs admin auth.
  const transitionResponse = await runTransition({
    fairId: params.fairId,
    toStatus: "CANCELLED",
    patch: {
      cancelled_at: new Date().toISOString(),
      cancellation_reason: parsed.data.reason,
      is_active: false,
    },
    note: `Cancelled: ${parsed.data.reason.slice(0, 200)}`,
  });

  if (transitionResponse.status !== 200) {
    return transitionResponse;
  }

  // 2. Fan-out cancellation emails to confirmed / paid / invoice-sent regs
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({
      success: true,
      status: "CANCELLED",
      emailsSent: 0,
      note: "Resend not configured — cancellation emails not sent.",
    });
  }

  const supabase = createAdminClient();
  const { data: fair } = await supabase
    .from("fairs")
    .select("*")
    .eq("id", params.fairId)
    .maybeSingle();
  const f = fair as Fair | null;
  if (!f) {
    return NextResponse.json({
      success: true,
      status: "CANCELLED",
      emailsSent: 0,
    });
  }

  const { data: regs } = await supabase
    .from("registrations")
    .select("id, contact_name, contact_email, university_name")
    .eq("fair_id", f.id)
    .in("status", ["invoice_sent", "paid", "confirmed"]);

  type Reg = {
    id: string;
    contact_name: string;
    contact_email: string;
    university_name: string;
  };
  const regList = (regs as Reg[] | null) || [];

  const refundLine = refundHint(f);
  const resend = getResend();
  let sent = 0;
  let failed = 0;

  for (const reg of regList) {
    try {
      // Upsert recipient + log to announcement_sends for audit
      const { data: rec } = await supabase
        .from("announcement_recipients")
        .upsert(
          {
            email: reg.contact_email.toLowerCase().trim(),
            name: reg.contact_name,
            organization: reg.university_name,
            source: "PAST_PARTICIPANT",
            is_active: true,
          },
          { onConflict: "email" }
        )
        .select("id")
        .single();

      const res = await resend.emails.send({
        from: FROM_EMAIL,
        to: reg.contact_email,
        subject: `Important — ${f.name} cancelled`,
        react: FairCancellationEmail({
          recipientName: reg.contact_name,
          universityName: reg.university_name,
          fairName: f.name,
          cancellationReason: parsed.data.reason,
          refundLine,
        }),
      });

      if (rec) {
        await supabase.from("announcement_sends").insert({
          fair_id: f.id,
          recipient_id: rec.id,
          email_type: "CANCELLATION",
          resend_email_id:
            (res as { data?: { id?: string } }).data?.id ?? null,
        });
      }
      sent += 1;
    } catch (e) {
      console.error("Cancellation email failed:", e);
      failed += 1;
    }
  }

  // Also stamp the cancelled_at on the fair record (already done by
  // runTransition, but we leave the formatted reason untouched).
  void formatDateLong; // ts: keep import if not used directly here

  return NextResponse.json({
    success: true,
    status: "CANCELLED",
    emailsSent: sent,
    emailsFailed: failed,
  });
}
