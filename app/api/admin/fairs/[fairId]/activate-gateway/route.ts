import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { GatewayOpenEmail } from "@/emails/GatewayOpenEmail";
import { appUrl } from "@/lib/mailerHelpers";
import type { Fair, Currency, Registration } from "@/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  note: z.string().max(2000).optional(),
});

interface ProformaRow {
  id: string;
  proforma_reference: string | null;
  payment_currency: Currency;
  total_amount_usd: number | null;
  total_amount_inr: number | null;
}

interface RegRow {
  id: string;
  contact_name: string;
  contact_email: string;
  university_name: string;
  total_tables: number;
  total_reps: number;
  addon_cost_usd: number;
  invoices: ProformaRow[] | null;
}

// Marker so TS keeps the Registration import alive (used by the type
// extension below to ensure RegRow shape stays in sync).
type _R = Registration;
void (null as unknown as _R);

/**
 * Flip the gateway on for a fair. Idempotent — running twice does
 * not re-fire emails because we only target rows that are still in
 * status='registered'.
 *
 * Steps:
 *   1. Auth check (admin only)
 *   2. Set fairs.payment_gateway_active = true, stamp activation
 *   3. Update all status='registered' regs to 'payment_open'
 *   4. Fan out GatewayOpenEmail with payment links
 *   5. Log to fair_status_log for audit
 */
export async function POST(
  req: Request,
  { params }: { params: { fairId: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* note is optional */
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body." },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();
  const { data: fair, error: fairErr } = await supabase
    .from("fairs")
    .select("*")
    .eq("id", params.fairId)
    .maybeSingle();
  if (fairErr || !fair) {
    return NextResponse.json({ error: "Fair not found." }, { status: 404 });
  }
  const f = fair as Fair;

  if (f.status !== "PUBLISHED" && f.status !== "REGISTRATION_CLOSED") {
    return NextResponse.json(
      {
        error:
          "Payment gateway can only be activated while the fair is published or registration is closed.",
      },
      { status: 409 }
    );
  }

  if (f.payment_gateway_active) {
    return NextResponse.json({
      ok: true,
      alreadyActive: true,
      notifiedCount: 0,
    });
  }

  // 1. Flip the flag + stamp activation metadata
  const activatedAt = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("fairs")
    .update({
      payment_gateway_active: true,
      gateway_activated_at: activatedAt,
      gateway_activation_note: parsed.data.note?.trim() || null,
    })
    .eq("id", f.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // 2. Bump pre-payment regs → 'payment_open' for this fair. Includes
  //    soft_confirmed holds (admin-acknowledged but unpaid) so a held
  //    spot becomes payable the moment the gateway opens (v22).
  const { error: bumpErr } = await supabase
    .from("registrations")
    .update({ status: "payment_open" })
    .eq("fair_id", f.id)
    .in("status", ["registered", "soft_confirmed"]);
  if (bumpErr) {
    return NextResponse.json({ error: bumpErr.message }, { status: 500 });
  }

  // 3. Pull every registration now in payment_open with its proforma invoice
  const { data: regs } = await supabase
    .from("registrations")
    .select(
      `id, contact_name, contact_email, university_name, total_tables, total_reps,
       addon_cost_usd,
       invoices:invoices(id, proforma_reference, payment_currency,
                         total_amount_usd, total_amount_inr)`
    )
    .eq("fair_id", f.id)
    .eq("status", "payment_open");

  const regList = (regs as RegRow[] | null) || [];

  // 4. Email each one
  let sent = 0;
  let failed = 0;
  const failures: { email: string; error: string }[] = [];

  if (process.env.RESEND_API_KEY) {
    const resend = getResend();
    for (const reg of regList) {
      const proforma =
        (reg.invoices ?? []).find((i) => i?.proforma_reference) ??
        reg.invoices?.[0] ??
        null;
      const totalUSD = Number(proforma?.total_amount_usd || 0);
      const baseUSD = totalUSD - Number(reg.addon_cost_usd || 0);
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: reg.contact_email,
          subject: `Payment now open — ${f.name}`,
          react: GatewayOpenEmail({
            contactName: reg.contact_name,
            universityName: reg.university_name,
            fairName: f.name,
            proformaReference: proforma?.proforma_reference || "—",
            baseAmountUSD: baseUSD,
            totalUSD,
            totalTables: reg.total_tables,
            totalReps: reg.total_reps,
            payUrl: `${appUrl()}/invoice/${reg.id}`,
            registrationDeadline: f.registration_deadline,
          }),
        });
        sent += 1;
      } catch (e) {
        failed += 1;
        failures.push({
          email: reg.contact_email,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
  }
  void undefined as unknown as Currency;

  // 5. Log to fair_status_log (status doesn't change, but the
  //    activation is a noteworthy event in the audit trail).
  await supabase.from("fair_status_log").insert({
    fair_id: f.id,
    from_status: f.status ?? null,
    to_status: f.status ?? "PUBLISHED",
    changed_by: admin.email,
    note: `Payment gateway activated. ${sent} universities notified${
      failed > 0 ? ` (${failed} failed)` : ""
    }.${parsed.data.note ? ` — ${parsed.data.note.trim()}` : ""}`,
  });

  return NextResponse.json({
    ok: true,
    activatedAt,
    notifiedCount: sent,
    failedCount: failed,
    failures: failures.slice(0, 20),
  });
}
