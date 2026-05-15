import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { processSuccessfulPayment } from "@/lib/processPayment";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-razorpay-signature header." },
      { status: 400 }
    );
  }

  const rawBody = await req.text();
  let valid = false;
  try {
    valid = verifyWebhookSignature(rawBody, signature);
  } catch (e) {
    console.error("Webhook signature error:", e);
  }
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 }
    );
  }

  let payload: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          method?: string;
          amount?: number;
          status?: string;
        };
      };
    };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const event = payload.event;
  const paymentEntity = payload.payload?.payment?.entity;

  if (!event || !paymentEntity || !paymentEntity.order_id) {
    return NextResponse.json({ ok: true, skipped: "no-payment-entity" });
  }

  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, invoice_id, registration_id")
    .eq("razorpay_order_id", paymentEntity.order_id)
    .maybeSingle();

  if (!payment) {
    console.warn(`Webhook: no payment row for order ${paymentEntity.order_id}`);
    return NextResponse.json({ ok: true, skipped: "no-local-payment" });
  }

  if (event === "payment.failed") {
    await supabase
      .from("payments")
      .update({
        razorpay_payment_id: paymentEntity.id || null,
        payment_method: paymentEntity.method || null,
        payment_status: "failed",
      })
      .eq("id", payment.id);
    return NextResponse.json({ ok: true, event });
  }

  if (event !== "payment.captured" && event !== "payment.authorized") {
    return NextResponse.json({ ok: true, skipped: `event:${event}` });
  }

  await supabase
    .from("payments")
    .update({
      razorpay_payment_id: paymentEntity.id || null,
      payment_method: paymentEntity.method || null,
      payment_status: "success",
      paid_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  const result = await processSuccessfulPayment(supabase, payment);

  return NextResponse.json({
    ok: true,
    event,
    mode: result.mode,
    invoiceNumber: result.invoiceNumber ?? null,
  });
}
