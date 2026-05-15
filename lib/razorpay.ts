import Razorpay from "razorpay";
import crypto from "crypto";
import type { Currency } from "@/types";

export function getRazorpay() {
  return new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Convert a major-unit amount (rupees or dollars) into Razorpay's
 * expected minor unit (paise or cents). Both currencies use ×100, so
 * the `Currency` param is for documentation / future-proofing only.
 */
export function toMinorUnit(amount: number, currency: Currency): number {
  void currency;
  return Math.round(amount * 100);
}

/** @deprecated use {@link toMinorUnit} */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
