import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RegistrationStatus } from "@/types";

export const runtime = "nodejs";

const ALLOWED_STATUSES: RegistrationStatus[] = [
  "registered",
  "payment_open",
  "pending",
  "invoice_sent",
  "paid",
  "confirmed",
  "cancelled",
];

// v19 — admin-editable identity/contact fields (typo fixes / details
// a rep gives us by phone or email). Pricing/booth are NOT here — those
// change invoice amounts and are handled separately.
const EDITABLE_FIELDS = [
  "university_name",
  "university_country",
  "university_website",
  "contact_name",
  "contact_title",
  "contact_email",
  "contact_phone",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { status?: string; details?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  // ---- Editable detail fields --------------------------------
  if (body.details && typeof body.details === "object") {
    for (const key of EDITABLE_FIELDS) {
      if (!(key in body.details)) continue;
      const raw = body.details[key];
      const val = typeof raw === "string" ? raw.trim() : raw;
      if (key === "contact_email") {
        if (typeof val !== "string" || !EMAIL_RE.test(val)) {
          return NextResponse.json(
            { error: "Enter a valid contact email." },
            { status: 422 }
          );
        }
      }
      if (
        (key === "university_name" || key === "contact_name") &&
        (typeof val !== "string" || val.length < 2)
      ) {
        return NextResponse.json(
          { error: `${key.replace("_", " ")} is required.` },
          { status: 422 }
        );
      }
      // Optional fields may be blanked to null; required ones keep value.
      update[key] =
        typeof val === "string" && val.length === 0 ? null : val;
    }
  }

  // ---- Status change -----------------------------------------
  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status as RegistrationStatus)) {
      return NextResponse.json(
        { error: "Invalid status value." },
        { status: 422 }
      );
    }
    update.status = body.status;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update." },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("registrations")
    .update(update)
    .eq("id", params.id)
    .select()
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Registration not found" },
      { status: 404 }
    );
  }

  // Cancelling a registration also voids its unpaid invoices so they no
  // longer read as outstanding.
  if (update.status === "cancelled") {
    await supabase
      .from("invoices")
      .update({ status: "cancelled" })
      .eq("registration_id", params.id)
      .neq("status", "paid");
  }

  return NextResponse.json({ registration: data });
}

/**
 * Hard-delete a registration (and, via ON DELETE CASCADE, its invoices,
 * billing details, payments, event opt-ins and booth scans). For junk /
 * test / duplicate rows, or a no-pay that should be purged rather than
 * kept as cancelled. Blocked once money has been taken.
 *
 * Prefer PATCH status="cancelled" for a normal "didn't pay in time" —
 * it keeps the audit trail and frees the email to re-register.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, status, university_name")
    .eq("id", params.id)
    .maybeSingle();
  if (!reg) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }
  if (reg.status === "paid" || reg.status === "confirmed") {
    return NextResponse.json(
      {
        error:
          "Cannot delete a paid/confirmed registration — its tax invoice is a financial record. Cancel it instead.",
      },
      { status: 409 }
    );
  }

  // Belt-and-braces: refuse if any payment actually succeeded.
  const { data: paid } = await supabase
    .from("payments")
    .select("id")
    .eq("registration_id", params.id)
    .eq("payment_status", "success")
    .limit(1);
  if (paid && paid.length > 0) {
    return NextResponse.json(
      { error: "A successful payment exists for this registration — delete blocked." },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("registrations")
    .delete()
    .eq("id", params.id);
  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not delete registration." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, deleted: reg.university_name });
}
