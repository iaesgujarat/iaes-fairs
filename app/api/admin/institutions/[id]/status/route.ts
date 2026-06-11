import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { InstitutionConfirmedEmail } from "@/emails/InstitutionConfirmedEmail";
import type { Fair } from "@/types";

export const runtime = "nodejs";

// PATCH /api/admin/institutions/[id]/status
// Body: { status: "registered" | "confirmed" | "cancelled" }
//
// Admin-only lifecycle transition for an institution_registrations
// row. Mirrors the InstitutionStatus enum in types/index.ts. Used by
// the InstitutionAdminTable Confirm / Cancel / Reactivate buttons.
// Transitioning INTO `confirmed` also emails the institution contact
// (previously the status change was silent).
const bodySchema = z
  .object({
    status: z.enum(["registered", "confirmed", "cancelled"]),
  })
  .strict();

function formatRange(fair: Fair): string {
  const start = fair.fair_date_start || fair.fair_date;
  const end = fair.fair_date_end || fair.fair_date;
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  if (!end || end === start) {
    return new Date(start).toLocaleDateString("en-IN", opts);
  }
  return `${new Date(start).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
  })} – ${new Date(end).toLocaleDateString("en-IN", opts)}`;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from("institution_registrations")
    .select("id, status, contact_name, institution_name, email, fair:fairs(*)")
    .eq("id", params.id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("institution_registrations")
    .update({ status: parsed.data.status })
    .eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify the institution on a real confirmation (non-blocking on
  // failure — the status change above already succeeded).
  let emailed = false;
  if (
    parsed.data.status === "confirmed" &&
    row.status !== "confirmed" &&
    process.env.RESEND_API_KEY
  ) {
    const fair = (Array.isArray(row.fair) ? row.fair[0] : row.fair) as
      | Fair
      | null;
    if (fair) {
      try {
        const resend = getResend();
        await resend.emails.send({
          from: FROM_EMAIL,
          to: row.email as string,
          subject: `Participation Confirmed — ${fair.name}`,
          react: InstitutionConfirmedEmail({
            contactName: row.contact_name as string,
            institutionName: row.institution_name as string,
            fairName: fair.name,
            fairDateRange: formatRange(fair),
            venue: fair.venue || fair.city,
          }),
        });
        emailed = true;
      } catch (e) {
        console.error("Institution confirmed email failed:", e);
      }
    }
  }

  return NextResponse.json({ success: true, status: parsed.data.status, emailed });
}
