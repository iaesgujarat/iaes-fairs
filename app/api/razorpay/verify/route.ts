import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { ConfirmationEmail } from "@/emails/ConfirmationEmail";
import type { Fair } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    registrationId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationId } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !registrationId) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  let ok = false;
  try {
    ok = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
  } catch (e) {
    console.error("Signature check threw:", e);
  }
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid payment signature." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .update({
      razorpay_payment_id,
      razorpay_signature,
      payment_status: "success",
      paid_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", razorpay_order_id)
    .select()
    .maybeSingle();

  if (!payment) {
    return NextResponse.json(
      { error: "Payment record not found for this order." },
      { status: 404 }
    );
  }

  await supabase
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", payment.invoice_id);

  await supabase
    .from("registrations")
    .update({ status: "confirmed" })
    .eq("id", registrationId);

  // Send confirmation email
  try {
    if (process.env.RESEND_API_KEY) {
      const { data: regJoin } = await supabase
        .from("registrations")
        .select(
          `*, fair:fairs(*), invoice:invoices(invoice_number, total_amount_inr)`
        )
        .eq("id", registrationId)
        .maybeSingle();

      if (regJoin) {
        const fair = regJoin.fair as Fair;
        const inv = Array.isArray(regJoin.invoice)
          ? regJoin.invoice[0]
          : regJoin.invoice;

        const resend = getResend();
        await resend.emails.send({
          from: FROM_EMAIL,
          to: regJoin.contact_email,
          subject: `Booking Confirmed — ${fair.name}`,
          react: ConfirmationEmail({
            contactName: regJoin.contact_name,
            universityName: regJoin.university_name,
            fairName: fair.name,
            fairDate: fair.fair_date,
            venue: fair.venue || fair.city,
            boothType: regJoin.booth_type,
            invoiceNumber: inv?.invoice_number || "",
            amountPaidInr: Number(inv?.total_amount_inr || 0),
          }),
        });
      }
    }
  } catch (e) {
    console.error("Confirmation email failed:", e);
  }

  return NextResponse.json({ success: true, registrationId });
}
