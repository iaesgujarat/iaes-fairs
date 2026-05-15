import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { InvoiceEmail } from "@/emails/InvoiceEmail";
import { ProformaEmail } from "@/emails/ProformaEmail";
import { buildInvoiceFields, generateProformaReference } from "@/lib/invoice";
import { getLiveForexRate } from "@/lib/forex";
import { getFairPricing } from "@/lib/pricing";
import {
  calculateBoothPricing,
  validateBoothConfig,
  FALLBACK_EXTRA_REP_USD,
  FALLBACK_EXTRA_TABLE_USD,
  FALLBACK_MAX_TABLES,
} from "@/lib/booth";
import { registrationSchema, TERMS_VERSION } from "@/lib/schemas";
import { formatFairDateRange } from "@/lib/mailerHelpers";
import type { Fair } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }
  const input = parsed.data;

  if (input.terms_accepted !== true) {
    return NextResponse.json(
      { error: "Terms and Conditions must be accepted." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: fair, error: fairErr } = await supabase
    .from("fairs")
    .select("*")
    .eq("id", input.fair_id)
    .maybeSingle();

  if (fairErr || !fair) {
    return NextResponse.json(
      { error: "Fair not found." },
      { status: 404 }
    );
  }
  const f = fair as Fair;

  if (f.status && f.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Registration is no longer open for this fair." },
      { status: 409 }
    );
  }

  // Lock pricing tier + booth fee at registration time
  const pricing = getFairPricing(f);
  const boothCheck = validateBoothConfig(
    { totalTables: input.total_tables, totalReps: input.total_reps },
    f.max_tables_per_university ?? FALLBACK_MAX_TABLES
  );
  if (!boothCheck.valid) {
    return NextResponse.json(
      { error: boothCheck.error || "Invalid booth configuration." },
      { status: 400 }
    );
  }
  const booth = calculateBoothPricing(
    { totalTables: input.total_tables, totalReps: input.total_reps },
    pricing.priceUSD,
    f.price_extra_table_usd ?? FALLBACK_EXTRA_TABLE_USD,
    f.price_extra_rep_usd ?? FALLBACK_EXTRA_REP_USD
  );

  // Gateway state decides everything downstream
  const gatewayActive = !!f.payment_gateway_active;
  const registrationStatus = gatewayActive ? "pending" : "registered";

  // ---- 1. Insert registration ---------------------------------
  const { data: registration, error: regErr } = await supabase
    .from("registrations")
    .insert({
      fair_id: input.fair_id,
      university_name: input.university_name,
      university_country: input.university_country,
      university_website: input.university_website || null,
      contact_name: input.contact_name,
      contact_title: input.contact_title || null,
      contact_email: input.contact_email,
      contact_phone: input.contact_phone || null,
      booth_type: input.booth_type,
      number_of_reps: input.total_reps,
      total_tables: input.total_tables,
      total_reps: input.total_reps,
      addon_tables: booth.addonTables,
      addon_reps: booth.addonReps,
      addon_cost_usd: booth.addonTotalCostUSD,
      payment_currency: input.payment_currency,
      pricing_tier: pricing.tier,
      special_requests: input.special_requests || null,
      status: registrationStatus,
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
    })
    .select()
    .single();

  if (regErr || !registration) {
    return NextResponse.json(
      { error: regErr?.message || "Could not create registration." },
      { status: 500 }
    );
  }

  // ---- 2. Billing details (INR only) --------------------------
  let payerState: string | null = null;
  if (input.payment_currency === "INR") {
    payerState = input.state || null;
    const { error: billErr } = await supabase
      .from("billing_details")
      .insert({
        registration_id: registration.id,
        legal_name: input.legal_name,
        billing_address: input.billing_address,
        city: input.city,
        state: input.state,
        pin_code: input.pin_code,
        pan_number: input.pan_number,
        is_gst_registered: !!input.is_gst_registered,
        gstin: input.gstin || null,
      });
    if (billErr) {
      console.error("billing_details insert failed:", billErr);
      return NextResponse.json(
        { error: "Could not save billing details." },
        { status: 500 }
      );
    }
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://fairs.iaesgujarat.org";

  // ============================================================
  // GATEWAY OFF — Proforma path
  //
  // No invoice_number consumed. GST = 0. Indicative INR shown
  // (final amount + GST get locked at payment time per v8 §9).
  // ============================================================
  if (!gatewayActive) {
    let indicativeForex: { rate: number; date: string } | null = null;
    if (input.payment_currency === "INR") {
      indicativeForex = await getLiveForexRate();
    }
    const indicativeINR = indicativeForex
      ? Number((booth.grandTotalUSD * indicativeForex.rate).toFixed(2))
      : null;

    const proformaRef = generateProformaReference();

    const { data: proforma, error: pfErr } = await supabase
      .from("invoices")
      .insert({
        registration_id: registration.id,
        invoice_number: null,
        invoice_type: "PROFORMA",
        proforma_reference: proformaRef,
        payment_currency: input.payment_currency,
        forex_rate_used: indicativeForex?.rate ?? null,
        forex_rate_date: indicativeForex?.date ?? null,
        base_amount_usd: booth.grandTotalUSD,
        base_amount_inr: indicativeINR,
        gst_type: "NONE",
        cgst_percent: 0,
        cgst_amount: 0,
        sgst_percent: 0,
        sgst_amount: 0,
        igst_percent: 0,
        igst_amount: 0,
        total_amount_usd: booth.grandTotalUSD,
        total_amount_inr: indicativeINR,
        due_date: f.registration_deadline,
        status: "unpaid",
      })
      .select()
      .single();

    if (pfErr || !proforma) {
      return NextResponse.json(
        { error: pfErr?.message || "Could not create proforma." },
        { status: 500 }
      );
    }

    // Send ProformaEmail — no payment button, no GST
    try {
      if (process.env.RESEND_API_KEY) {
        const resend = getResend();
        await resend.emails.send({
          from: FROM_EMAIL,
          to: input.contact_email,
          subject: `You're registered — ${f.name} (${proformaRef})`,
          react: ProformaEmail({
            contactName: input.contact_name,
            universityName: input.university_name,
            fairName: f.name,
            fairDateRange: formatFairDateRange(f),
            proformaReference: proformaRef,
            paymentCurrency: input.payment_currency,
            baseAmountUSD: booth.grandTotalUSD,
            indicativeINR,
            forexRate: indicativeForex?.rate ?? null,
            forexDate: indicativeForex?.date ?? null,
            addonTables: booth.addonTables,
            addonReps: booth.addonReps,
            addonTablesCostUSD: booth.addonTablesCostUSD,
            addonRepsCostUSD: booth.addonRepsCostUSD,
            tierLabel:
              pricing.tier === "EARLYBIRD" ? "Early Bird" : "Standard",
            totalUSD: booth.grandTotalUSD,
          }),
        });
      }
    } catch (e) {
      console.error("Proforma email failed:", e);
    }

    return NextResponse.json({
      registrationId: registration.id,
      gatewayActive: false,
      proformaReference: proformaRef,
    });
  }

  // ============================================================
  // GATEWAY ON — TAX invoice path (legacy v2 flow)
  //
  // Forex + GST + invoice_number all happen here. Razorpay
  // payment captures, webhook flips statuses only.
  // ============================================================
  const { row: invoiceRow } = await buildInvoiceFields({
    paymentCurrency: input.payment_currency,
    boothPriceUSD: booth.grandTotalUSD,
    payerState,
    isGSTRegistered: !!input.is_gst_registered,
  });

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      registration_id: registration.id,
      invoice_type: "TAX",
      proforma_reference: null,
      ...invoiceRow,
      due_date: f.registration_deadline,
      status: "unpaid",
    })
    .select()
    .single();

  if (invErr || !invoice) {
    return NextResponse.json(
      { error: invErr?.message || "Could not create invoice." },
      { status: 500 }
    );
  }

  await supabase
    .from("registrations")
    .update({ status: "invoice_sent" })
    .eq("id", registration.id);

  const payUrl = `${appUrl}/payment/${registration.id}`;
  try {
    if (process.env.RESEND_API_KEY) {
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: input.contact_email,
        subject: `Invoice for ${f.name} — ${invoice.invoice_number}`,
        react: InvoiceEmail({
          contactName: input.contact_name,
          universityName: input.university_name,
          fairName: f.name,
          invoiceNumber: invoice.invoice_number ?? "",
          paymentCurrency: input.payment_currency,
          totalAmountUSD: invoice.total_amount_usd
            ? Number(invoice.total_amount_usd)
            : null,
          totalAmountINR: invoice.total_amount_inr
            ? Number(invoice.total_amount_inr)
            : null,
          dueDate: f.registration_deadline,
          payUrl,
        }),
      });
    }
  } catch (e) {
    console.error("Invoice email failed:", e);
  }

  return NextResponse.json({
    registrationId: registration.id,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    gatewayActive: true,
  });
}
