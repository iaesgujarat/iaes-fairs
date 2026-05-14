import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { InvoiceEmail } from "@/emails/InvoiceEmail";
import { calculateInvoiceAmounts } from "@/lib/invoice";
import { registrationSchema } from "@/lib/schemas";
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

  const supabase = createAdminClient();

  const { data: fair, error: fairErr } = await supabase
    .from("fairs")
    .select("*")
    .eq("id", input.fair_id)
    .eq("is_active", true)
    .maybeSingle();

  if (fairErr || !fair) {
    return NextResponse.json(
      { error: "Fair not found or no longer accepting registrations." },
      { status: 404 }
    );
  }
  const f = fair as Fair;

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
      special_requests: input.special_requests || null,
      status: "pending",
    })
    .select()
    .single();

  if (regErr || !registration) {
    return NextResponse.json(
      { error: regErr?.message || "Could not create registration." },
      { status: 500 }
    );
  }

  const amounts = calculateInvoiceAmounts(Number(f.booth_price_inr));

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      registration_id: registration.id,
      amount_inr: amounts.amount_inr,
      amount_usd: f.booth_price_usd,
      gst_percent: amounts.gst_percent,
      gst_amount_inr: amounts.gst_amount_inr,
      total_amount_inr: amounts.total_amount_inr,
      currency: "INR",
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

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://fairs.iaesgujarat.org";
  const payUrl = `${appUrl}/payment/${registration.id}`;

  // Send invoice email (non-blocking failure — we still return success on DB write)
  try {
    if (process.env.RESEND_API_KEY) {
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: input.contact_email,
        subject: `Invoice for ${f.name} — ${input.university_name}`,
        react: InvoiceEmail({
          contactName: input.contact_name,
          universityName: input.university_name,
          fairName: f.name,
          invoiceNumber: invoice.invoice_number,
          amountInr: amounts.total_amount_inr,
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
