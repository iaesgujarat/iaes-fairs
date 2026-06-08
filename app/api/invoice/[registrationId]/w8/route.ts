import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { w8Download } from "@/lib/w8";

export const runtime = "nodejs";

/**
 * Gated download of IAES's signed W-8BEN-E. Reachable only with a valid
 * registration UUID whose invoice is in USD — the same access model as the
 * invoice page itself, so the signed tax doc is never served at a public /
 * guessable URL. INR registrations get a 404 (no US form applies).
 */
export async function GET(
  _req: Request,
  { params }: { params: { registrationId: string } }
) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("registrations")
    .select(`id, invoices:invoices(payment_currency)`)
    .eq("id", params.registrationId)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const invoices = (
    Array.isArray(data.invoices) ? data.invoices : [data.invoices]
  ) as ({ payment_currency: string } | null)[];
  const isUSD = invoices.some((i) => i && i.payment_currency === "USD");
  if (!isUSD) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = w8Download();
  if (!file) {
    return NextResponse.json(
      { error: "Form unavailable." },
      { status: 503 }
    );
  }

  return new NextResponse(new Uint8Array(file.content), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${file.filename}"`,
      // Signed tax doc — keep it out of shared/CDN caches.
      "Cache-Control": "private, no-store",
    },
  });
}
