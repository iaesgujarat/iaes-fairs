import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { InvoiceEmail } from "@/emails/InvoiceEmail";
import { ProformaEmail } from "@/emails/ProformaEmail";
import { PremiumConfirmationEmail } from "@/emails/PremiumConfirmationEmail";
import { buildInvoiceFields, generateProformaReference } from "@/lib/invoice";
import { getLiveForexRate, type ForexRate } from "@/lib/forex";
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
import type { Fair, PricingTier } from "@/types";

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
    return NextResponse.json({ error: "Fair not found." }, { status: 404 });
  }
  const f = fair as Fair;

  if (f.status && f.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Registration is no longer open for this fair." },
      { status: 409 }
    );
  }

  // Dedupe: one registration per (fair, email). Case-insensitive;
  // a CANCELLED registration may re-register. `.limit(1)` (not
  // maybeSingle) so pre-existing legacy duplicates don't throw.
  const { data: dupes } = await supabase
    .from("registrations")
    .select("id")
    .eq("fair_id", input.fair_id)
    .ilike("contact_email", input.contact_email)
    .neq("status", "cancelled")
    .limit(1);
  if (dupes && dupes.length > 0) {
    return NextResponse.json(
      {
        error:
          "This email is already registered for this fair. To change your booth or details, contact eduadviser@iaesgujarat.org.",
      },
      { status: 409 }
    );
  }

  // --------------------------------------------------------------
  // Lock the tier + booth fee server-side. The client is NEVER
  // trusted for amounts; "PREMIUM" only switches the path.
  // --------------------------------------------------------------
  let tier: PricingTier;
  let totalTables: number;
  let totalReps: number;
  let boothTotalUSD: number;
  let addonTables = 0;
  let addonReps = 0;
  let addonTablesCostUSD = 0;
  let addonRepsCostUSD = 0;
  let addonTotalCostUSD = 0;
  let boothTypeValue: "Standard" | "Premium";
  let tierLabel: "Early Bird" | "Standard" | "Premium";

  const isPremium = input.pricing_tier === "PREMIUM";

  if (isPremium) {
    const premiumUSD = f.price_premium_usd;
    if (!premiumUSD) {
      return NextResponse.json(
        { error: "Premium booth is not available for this fair." },
        { status: 400 }
      );
    }
    // Deadline (start-of-day compare, mirrors getActivePricingState)
    if (f.premium_deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dl = new Date(f.premium_deadline);
      dl.setHours(0, 0, 0, 0);
      if (today.getTime() > dl.getTime()) {
        return NextResponse.json(
          { error: "Premium registration deadline has passed." },
          { status: 400 }
        );
      }
    }
    // Atomic slot check against the live view
    const { data: slot } = await supabase
      .from("premium_slot_status")
      .select("slots_remaining")
      .eq("fair_id", f.id)
      .maybeSingle();
    if (!slot || (slot.slots_remaining ?? 0) <= 0) {
      return NextResponse.json(
        { error: "Premium booth is sold out. Please choose Standard." },
        { status: 400 }
      );
    }

    tier = "PREMIUM";
    totalTables = 2;
    totalReps = 4;
    boothTotalUSD = Number(premiumUSD);
    boothTypeValue = "Premium";
    tierLabel = "Premium";
  } else {
    const pricing = getFairPricing(f);
    const maxTbl = f.max_tables_per_university ?? FALLBACK_MAX_TABLES;
    const boothCheck = validateBoothConfig(
      { totalTables: input.total_tables, totalReps: input.total_reps },
      maxTbl
    );
    if (!boothCheck.valid) {
      return NextResponse.json(
        { error: boothCheck.error || "Invalid booth configuration." },
        { status: 400 }
      );
    }

    // Add-on table pool: cap per-reg + shared pool availability.
    const requestedAddonTables = Math.max(0, input.total_tables - 1);
    const maxAddon = f.max_addon_tables_per_reg ?? 1;
    if (requestedAddonTables > maxAddon) {
      return NextResponse.json(
        { error: `Maximum ${maxAddon} extra table(s) allowed.` },
        { status: 400 }
      );
    }
    if (requestedAddonTables > 0) {
      const { data: poolRow } = await supabase
        .from("addon_table_status")
        .select("tables_remaining")
        .eq("fair_id", f.id)
        .maybeSingle();
      const remaining = poolRow?.tables_remaining ?? null;
      if (remaining != null && remaining < requestedAddonTables) {
        return NextResponse.json(
          { error: "Extra table slots are fully booked for this fair." },
          { status: 400 }
        );
      }
    }

    const booth = calculateBoothPricing(
      { totalTables: input.total_tables, totalReps: input.total_reps },
      pricing.priceUSD,
      f.price_extra_table_usd ?? FALLBACK_EXTRA_TABLE_USD,
      f.price_extra_rep_usd ?? FALLBACK_EXTRA_REP_USD
    );

    tier = pricing.tier;
    totalTables = input.total_tables;
    totalReps = input.total_reps;
    boothTotalUSD = booth.grandTotalUSD;
    addonTables = booth.addonTables;
    addonReps = booth.addonReps;
    addonTablesCostUSD = booth.addonTablesCostUSD;
    addonRepsCostUSD = booth.addonRepsCostUSD;
    addonTotalCostUSD = booth.addonTotalCostUSD;
    boothTypeValue = "Standard";
    tierLabel = pricing.tier === "EARLYBIRD" ? "Early Bird" : "Standard";
  }

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
      booth_type: boothTypeValue,
      number_of_reps: totalReps,
      total_tables: totalTables,
      total_reps: totalReps,
      addon_tables: addonTables,
      addon_reps: addonReps,
      addon_cost_usd: addonTotalCostUSD,
      payment_currency: input.payment_currency,
      pricing_tier: tier,
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

  // ---- 1b. Event opt-ins (v15) — best-effort, never fail the
  // registration over attendance-planning data. Only persist ids
  // that are genuinely public stops of THIS fair.
  if (input.event_optins && input.event_optins.length > 0) {
    try {
      const { data: pub } = await supabase
        .from("fair_itinerary")
        .select("id")
        .eq("fair_id", input.fair_id)
        .eq("is_public", true);
      const valid = new Set((pub ?? []).map((p) => p.id as string));
      const rows = input.event_optins
        .filter((id) => valid.has(id))
        .map((itinerary_stop_id) => ({
          registration_id: registration.id,
          itinerary_stop_id,
        }));
      if (rows.length > 0) {
        await supabase.from("registration_event_optin").insert(rows);
      }
    } catch (e) {
      console.error("Event opt-in persist failed (non-fatal):", e);
    }
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
  // ============================================================
  if (!gatewayActive) {
    let indicativeForex: ForexRate | null = null;
    if (input.payment_currency === "INR") {
      indicativeForex = await getLiveForexRate();
    }
    const indicativeINR = indicativeForex
      ? Number((boothTotalUSD * indicativeForex.rate).toFixed(2))
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
        forex_rate_source: indicativeForex?.source ?? null,
        forex_rate_time: indicativeForex?.time ?? null,
        base_amount_usd: boothTotalUSD,
        base_amount_inr: indicativeINR,
        gst_type: "NONE",
        cgst_percent: 0,
        cgst_amount: 0,
        sgst_percent: 0,
        sgst_amount: 0,
        igst_percent: 0,
        igst_amount: 0,
        total_amount_usd: boothTotalUSD,
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

    try {
      if (process.env.RESEND_API_KEY) {
        const resend = getResend();
        if (isPremium) {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: input.contact_email,
            subject: `💎 Premium Booth Reserved — ${f.name} (${proformaRef})`,
            react: PremiumConfirmationEmail({
              contactName: input.contact_name,
              universityName: input.university_name,
              fairName: f.name,
              fairDateRange: formatFairDateRange(f),
              proformaReference: proformaRef,
              amountUSD: boothTotalUSD,
              premiumDeadline: f.premium_deadline ?? null,
            }),
          });
        } else {
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
              baseAmountUSD: boothTotalUSD,
              indicativeINR,
              forexRate: indicativeForex?.rate ?? null,
              forexDate: indicativeForex?.date ?? null,
              addonTables,
              addonReps,
              addonTablesCostUSD,
              addonRepsCostUSD,
              tierLabel: tierLabel === "Premium" ? "Standard" : tierLabel,
              totalUSD: boothTotalUSD,
            }),
          });
        }
      }
    } catch (e) {
      console.error("Confirmation email failed:", e);
    }

    return NextResponse.json({
      registrationId: registration.id,
      gatewayActive: false,
      proformaReference: proformaRef,
    });
  }

  // ============================================================
  // GATEWAY ON — TAX invoice path
  // ============================================================
  const { row: invoiceRow } = await buildInvoiceFields({
    paymentCurrency: input.payment_currency,
    boothPriceUSD: boothTotalUSD,
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
