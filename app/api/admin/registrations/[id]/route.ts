import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RegistrationStatus } from "@/types";

export const runtime = "nodejs";

const ALLOWED_STATUSES: RegistrationStatus[] = [
  "pending",
  "invoice_sent",
  "paid",
  "confirmed",
  "cancelled",
];

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

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.status || !ALLOWED_STATUSES.includes(body.status as RegistrationStatus)) {
    return NextResponse.json(
      { error: "Invalid status value." },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("registrations")
    .update({ status: body.status })
    .eq("id", params.id)
    .select()
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Registration not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ registration: data });
}
