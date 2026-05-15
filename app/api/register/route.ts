import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { InvoiceEmail } from "@/emails/InvoiceEmail";
import { buildInvoiceFields } from "@/lib/invoice";
import { getFairPricing } from "@/lib/pricing";
import { registrationSchema, TERMS_VERSION } from "@/lib/schemas";
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

  // Belt-and-braces server-side guard. The schema already enforces this,
  // but the registrations table now has a NOT NULL check we never want
  // to hit from a real flow.
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
      { error: "Fair not found or no longer accepting registrations." },
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

  // Lock the pricing tier + booth fee that's active right now.
  const pricing = getFairPricing(f);

  // 1. Insert registration
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
      number_of_reps: input.number_of_reps,
      payment_currency: input.payment_currency,
      pricing_tier: pricing.tier,
      special_requests: input.special_requests || null,
      status: "pending",
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

  // 2. Insert billing_details (INR path only)
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

  // 3. Compute invoice (forex + GST) — using the tier-locked price
  const { row: invoiceRow } = await buildInvoiceFields({
    paymentCurrency: input.payment_currency,
    boothPriceUSD: pricing.priceUSD,
    payerState,
    isGSTRegistered: !!input.is_gst_registered,
  });

  // 4. Insert invoice
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      registration_id: registration.id,
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

  // 5. Send invoice email
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://fairs.iaesgujarat.org";
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
          invoiceNumber: invoice.invoice_number,
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
  });
}
