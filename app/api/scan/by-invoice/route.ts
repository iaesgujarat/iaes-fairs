import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Resolve a university's registration_id from an invoice number.
 * Used once per rep / device on /scan to "log in" to scanning mode
 * — the resulting registration_id is then stored in localStorage.
 *
 * GET /api/scan/by-invoice?number=IAES-FAIR-USD-2026-001
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const number = url.searchParams.get("number")?.trim();
  if (!number) {
    return NextResponse.json(
      { error: "Pass invoice number as ?number=…" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      `id, invoice_number, registration_id, status,
       registration:registrations(id, university_name, status)`
    )
    .eq("invoice_number", number.toUpperCase())
    .maybeSingle();

  if (error || !invoice) {
    return NextResponse.json(
      { error: "Invoice not found. Check the number and try again." },
      { status: 404 }
    );
  }

  const reg = Array.isArray(invoice.registration)
    ? invoice.registration[0]
    : invoice.registration;

  if (!reg) {
    return NextResponse.json(
      { error: "Registration not found for this invoice." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    registrationId: reg.id,
    universityName: reg.university_name,
    invoiceNumber: invoice.invoice_number,
    registrationStatus: reg.status,
  });
}
