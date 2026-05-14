"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/Button";

interface OrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  prefill: { name: string; email: string; contact: string };
  invoiceNumber: string;
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

export function PaymentButton({
  registrationId,
  totalAmountInr,
  fairName,
}: {
  registrationId: string;
  totalAmountInr: number;
  fairName: string;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Could not start payment.");
        if (!cancelled) setOrder(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Payment setup failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [registrationId]);

  function openCheckout() {
    if (!order || !window.Razorpay) return;
    setError(null);
    const rzp = new window.Razorpay({
      key: order.key,
      amount: order.amount,
      currency: order.currency,
      name: "IAES EducationUSA Fair",
      description: `Booth Registration — ${fairName}`,
      order_id: order.orderId,
      prefill: order.prefill,
      theme: { color: "#0B2B5C" },
      handler: async function (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) {
        try {
          const verify = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...response, registrationId }),
          });
          const v = await verify.json();
          if (!verify.ok) throw new Error(v?.error || "Verification failed.");
          router.push(`/confirmation/${registrationId}`);
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not verify payment. Please contact support."
          );
        }
      },
      modal: {
        ondismiss: () => setError("Payment cancelled. You can retry below."),
      },
    });
    rzp.open();
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptReady(true)}
        strategy="afterInteractive"
      />
      <div className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Button
          variant="gold"
          size="lg"
          onClick={openCheckout}
          disabled={!order || !scriptReady || loading}
          loading={loading || (order != null && !scriptReady)}
          className="w-full"
        >
          {loading
            ? "Preparing secure payment..."
            : `Pay ${new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              }).format(totalAmountInr)} via Razorpay`}
        </Button>
        <p className="text-center text-xs text-navy/50">
          Secured by Razorpay. Cards, UPI, and netbanking accepted.
        </p>
      </div>
    </>
  );
}
