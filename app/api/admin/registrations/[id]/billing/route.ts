import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { billingDetailsSchema } from "@/lib/schemas";
import { buildInvoiceFields } from "@/lib/invoice";
import { getLiveForexRate } from "@/lib/forex";
import type { Invoice } from "@/types";

export const runtime = "nodejs";

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_users")
    .select("email")
    .eq("email", user.email!)
    .maybeSingle();
  return data ? user : null;
}

/**
 * v19 Phase 5 — admin sets/changes who a registration is billed to,
 * BEFORE payment. Two shapes:
 *
 *   mode "university"   → USD / export of service. Optional "Attn:"
 *                         recipient (legal entity stays the university).
 *                         Drops any India-office billing row.
 *   mode "india_office" → INR / GST. A separate Indian legal entity is
 *                         the customer (e.g. Sannam S4). Writes
 *                         billing_details + flips the invoice to INR.
 *
 * Hard-blocked once a payment has locked a tax invoice (paid/confirmed):
 * a billed party can never be changed retroactively after payment.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    mode?: "university" | "india_office";
    // university mode
    bill_to_self?: boolean;
    bill_to_attn_name?: string;
    bill_to_attn_title?: string;
    bill_to_attn_email?: string;
    bill_to_cc?: boolean;
    // india_office mode (billing_details shape)
    legal_name?: string;
    billing_address?: string;
    city?: string;
    state?: string;
    pin_code?: string;
    pan_number?: string;
    is_gst_registered?: boolean;
    gstin?: string;
    authorization_note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.mode !== "university" && body.mode !== "india_office") {
    return NextResponse.json(
      { error: "mode must be 'university' or 'india_office'." },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, status, contact_email")
    .eq("id", params.id)
    .maybeSingle();
  if (!reg) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  // All invoices for this registration, newest first.
  const { data: invoicesRaw } = await supabase
    .from("invoices")
    .select("*")
    .eq("registration_id", params.id)
    .order("issued_at", { ascending: false });
  const invoices = (invoicesRaw as Invoice[] | null) ?? [];

  // Lock the billed party ONLY once money has actually been received —
  // i.e. a TAX invoice is paid. A bare "confirmed" status does NOT lock
  // billing: an admin can soft-confirm to hold a spot BEFORE payment,
  // and the recipient must stay editable until real payment lands.
  const hasPaidTaxInvoice = invoices.some(
    (i) => i.invoice_type === "TAX" && i.status === "paid"
  );
  if (reg.status === "paid" || hasPaidTaxInvoice) {
    return NextResponse.json(
      {
        error:
          "This registration is paid — the tax invoice is locked and the billed party can no longer be changed.",
      },
      { status: 409 }
    );
  }

  // The single active (unpaid) invoice — proforma (gateway off) or an
  // unpaid tax invoice (gateway on). Either way, not yet paid.
  const active =
    invoices.find((i) => i.invoice_type === "TAX") ??
    invoices.find((i) => i.invoice_type === "PROFORMA") ??
    null;

  // ----- Mode B: India office pays (INR / GST) ------------------
  if (body.mode === "india_office") {
    const billing = {
      legal_name: body.legal_name,
      billing_address: body.billing_address,
      city: body.city,
      state: body.state,
      pin_code: body.pin_code,
      pan_number: body.pan_number,
      is_gst_registered: !!body.is_gst_registered,
      gstin: body.gstin,
    };
    const parsed = billingDetailsSchema.safeParse(billing);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid billing details.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }
    if (parsed.data.is_gst_registered && !parsed.data.gstin) {
      return NextResponse.json(
        { error: "GSTIN is required when GST registered." },
        { status: 422 }
      );
    }

    // Upsert billing_details (registration_id is UNIQUE).
    const { error: billErr } = await supabase
      .from("billing_details")
      .upsert(
        {
          registration_id: params.id,
          legal_name: parsed.data.legal_name,
          billing_address: parsed.data.billing_address,
          city: parsed.data.city,
          state: parsed.data.state,
          pin_code: parsed.data.pin_code,
          pan_number: parsed.data.pan_number,
          is_gst_registered: parsed.data.is_gst_registered,
          gstin: parsed.data.gstin || null,
          authorization_note: body.authorization_note?.trim() || null,
        },
        { onConflict: "registration_id" }
      );
    if (billErr) {
      return NextResponse.json(
        { error: billErr.message || "Could not save billing details." },
        { status: 500 }
      );
    }

    // Registration is now billed to the India office, in INR. Clear any
    // Mode-A "Attn:" override (not applicable when a separate entity pays).
    await supabase
      .from("registrations")
      .update({
        payment_currency: "INR",
        bill_to_attn_name: null,
        bill_to_attn_title: null,
        bill_to_attn_email: null,
        bill_to_cc: false,
      })
      .eq("id", params.id);

    // Re-point the active invoice to INR so the document + amounts match.
    if (active) {
      const baseUSD = Number(active.base_amount_usd ?? 0);
      if (active.invoice_type === "TAX") {
        // Unpaid tax invoice — recompute the full GST row (keep number).
        const { row } = await buildInvoiceFields({
          paymentCurrency: "INR",
          boothPriceUSD: baseUSD,
          payerState: parsed.data.state,
          isGSTRegistered: parsed.data.is_gst_registered,
        });
        await supabase.from("invoices").update(row).eq("id", active.id);
      } else {
        // Proforma — indicative INR base only; GST is finalised at order
        // time and shown as an estimate at render. Just attach forex.
        const forex = await getLiveForexRate();
        await supabase
          .from("invoices")
          .update({
            payment_currency: "INR",
            forex_rate_used: forex.rate,
            forex_rate_date: forex.date,
            forex_rate_source: forex.source,
            forex_rate_time: forex.time,
            base_amount_inr: Number((baseUSD * forex.rate).toFixed(2)),
            total_amount_inr: Number((baseUSD * forex.rate).toFixed(2)),
            total_amount_usd: null,
            gst_type: "NONE",
          })
          .eq("id", active.id);
      }
    }

    return NextResponse.json({ ok: true, mode: "india_office" });
  }

  // ----- Mode A: university pays directly (USD) -----------------
  const self = body.bill_to_self !== false;
  const attnName = self ? null : body.bill_to_attn_name?.trim() || null;
  const attnEmail = self ? null : body.bill_to_attn_email?.trim() || null;
  if (!self && (!attnName || !attnEmail)) {
    return NextResponse.json(
      { error: "Recipient name and email are required when addressing to someone else." },
      { status: 422 }
    );
  }

  await supabase
    .from("registrations")
    .update({
      payment_currency: "USD",
      bill_to_attn_name: attnName,
      bill_to_attn_title: self ? null : body.bill_to_attn_title?.trim() || null,
      bill_to_attn_email: attnEmail,
      bill_to_cc: self ? false : !!body.bill_to_cc,
    })
    .eq("id", params.id);

  // No separate Indian entity — drop any India-office billing row.
  await supabase.from("billing_details").delete().eq("registration_id", params.id);

  // Re-point the active invoice back to USD / export of service.
  if (active) {
    const baseUSD = Number(active.base_amount_usd ?? 0);
    await supabase
      .from("invoices")
      .update({
        payment_currency: "USD",
        forex_rate_used: null,
        forex_rate_date: null,
        forex_rate_source: null,
        forex_rate_time: null,
        base_amount_inr: null,
        total_amount_inr: null,
        total_amount_usd: baseUSD,
        gst_type: "NONE",
        cgst_percent: 0,
        cgst_amount: 0,
        sgst_percent: 0,
        sgst_amount: 0,
        igst_percent: 0,
        igst_amount: 0,
      })
      .eq("id", active.id);
  }

  return NextResponse.json({ ok: true, mode: "university" });
}
