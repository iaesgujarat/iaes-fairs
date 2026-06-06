import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Resolve a booth's scanning identity from its registration id. Powers
 * the pre-bound "ready" scan link /scan?b=<registrationId> that IAES
 * shares with each university — one tap and they're scanning, no invoice
 * typing on fair day. The registration id is a non-enumerable UUID;
 * their student DATA stays separately protected by the portal's
 * last-4-phone gate, so a shared scan link exposes nothing.
 *
 * GET /api/scan/by-registration?reg=<uuid>
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const reg = url.searchParams.get("reg")?.trim();
  if (!reg) {
    return NextResponse.json(
      { error: "Pass registration id as ?reg=…" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: registration, error } = await supabase
    .from("registrations")
    .select(
      `id, university_name, status,
       invoices(invoice_number, proforma_reference)`
    )
    .eq("id", reg)
    .maybeSingle();

  if (error || !registration) {
    return NextResponse.json(
      { error: "Booth not found. Check your link or enter your invoice number." },
      { status: 404 }
    );
  }
  if (registration.status === "cancelled") {
    return NextResponse.json(
      { error: "This booth registration is cancelled." },
      { status: 403 }
    );
  }

  const invoices =
    (registration.invoices as
      | { invoice_number: string | null; proforma_reference: string | null }[]
      | null) ?? [];
  const reference =
    invoices.find((i) => i.invoice_number)?.invoice_number ??
    invoices.find((i) => i.proforma_reference)?.proforma_reference ??
    "—";

  return NextResponse.json({
    registrationId: registration.id,
    universityName: registration.university_name,
    invoiceNumber: reference,
    registrationStatus: registration.status,
  });
}
