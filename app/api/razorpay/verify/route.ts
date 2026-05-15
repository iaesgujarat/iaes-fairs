import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { processSuccessfulPayment } from "@/lib/processPayment";

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

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    registrationId,
  } = body;

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !registrationId
  ) {
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

  // Mark the payment row success and grab its FKs for the finaliser
  const { data: payment } = await supabase
    .from("payments")
    .update({
      razorpay_payment_id,
      razorpay_signature,
      payment_status: "success",
      paid_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", razorpay_order_id)
    .select("id, invoice_id, registration_id")
    .maybeSingle();

  if (!payment) {
    return NextResponse.json(
      { error: "Payment record not found for this order." },
      { status: 404 }
    );
  }

  // Shared idempotent finaliser — same logic the webhook runs.
  // Whichever fires first wins; the other is a no-op.
  const result = await processSuccessfulPayment(supabase, payment);

  return NextResponse.json({
    success: true,
    registrationId,
    mode: result.mode,
    invoiceNumber: result.invoiceNumber ?? null,
  });
}
