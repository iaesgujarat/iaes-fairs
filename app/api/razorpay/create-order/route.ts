import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpay, toPaise } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { registrationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.registrationId) {
    return NextResponse.json(
      { error: "registrationId is required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: registration, error: regErr } = await supabase
    .from("registrations")
    .select("id, status, contact_email, contact_name, contact_phone, university_name")
    .eq("id", body.registrationId)
    .maybeSingle();

  if (regErr || !registration) {
    return NextResponse.json(
      { error: "Registration not found." },
      { status: 404 }
    );
  }

  if (registration.status === "paid" || registration.status === "confirmed") {
    return NextResponse.json(
      { error: "This registration is already paid." },
      { status: 409 }
    );
  }

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("registration_id", body.registrationId)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (invErr || !invoice) {
    return NextResponse.json(
      { error: "Invoice not found for this registration." },
      { status: 404 }
    );
  }

  if (!process.env.RAZORPAY_KEY_SECRET || !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    return NextResponse.json(
      { error: "Razorpay is not configured. Set the keys in environment variables." },
      { status: 500 }
    );
  }

  const razorpay = getRazorpay();
  const amountPaise = toPaise(Number(invoice.total_amount_inr));

  let order;
  try {
    order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: invoice.invoice_number,
      notes: {
        registration_id: registration.id,
        invoice_id: invoice.id,
        university_name: registration.university_name,
      },
    });
  } catch (e) {
    console.error("Razorpay order failed:", e);
    return NextResponse.json(
      { error: "Could not create Razorpay order." },
      { status: 502 }
    );
  }

  // Record an initiated payment
  await supabase.from("payments").insert({
    invoice_id: invoice.id,
    registration_id: registration.id,
    razorpay_order_id: order.id,
    amount_paid_inr: Number(invoice.total_amount_inr),
    payment_status: "initiated",
  });

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    prefill: {
      name: registration.contact_name,
      email: registration.contact_email,
      contact: registration.contact_phone || "",
    },
    invoiceNumber: invoice.invoice_number,
  });
}
