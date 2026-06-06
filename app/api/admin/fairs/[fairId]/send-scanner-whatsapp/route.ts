import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  registerWhatsAppContact,
  sendWhatsAppTemplate,
  WA_TEMPLATES,
} from "@/lib/whatsappNotify";
import type { Fair } from "@/types";

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
 * Fair-morning WhatsApp nudge: each university gets the `booth_scanner_ready`
 * template with a tap-to-open button to its pre-bound scan link
 * (/scan/b/<registrationId>). Admin-triggered on the day. No-op for any
 * number we can't resolve or while the template/channel is dark — email
 * already carried the same link a week earlier.
 */
export async function POST(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: fair } = await supabase
    .from("fairs")
    .select("id, name")
    .eq("id", params.fairId)
    .maybeSingle();
  if (!fair) {
    return NextResponse.json({ error: "Fair not found." }, { status: 404 });
  }
  const f = fair as Pick<Fair, "id" | "name">;

  const { data: regs } = await supabase
    .from("registrations")
    .select(
      "id, contact_name, contact_phone, university_name, university_country, whatsapp_consent, status"
    )
    .eq("fair_id", params.fairId)
    .neq("status", "cancelled");

  let attempted = 0;
  for (const reg of regs ?? []) {
    attempted += 1;
    // Keep the registry fresh, then send the nudge with a button to the
    // booth's pre-bound scan link ({{1}} suffix = registration id).
    await registerWhatsAppContact(supabase, {
      rawPhone: reg.contact_phone as string | null,
      name: reg.contact_name as string,
      audience: "university",
      country: reg.university_country as string | null,
      fairId: params.fairId,
      consent: !!reg.whatsapp_consent,
    });
    await sendWhatsAppTemplate(supabase, {
      fairId: params.fairId,
      rawPhone: reg.contact_phone as string | null,
      template: WA_TEMPLATES.BOOTH_SCANNER_READY,
      context: "booth_scanner_ready",
      bodyParams: [reg.contact_name as string, f.name],
      urlButtonParam: reg.id as string,
    });
  }

  return NextResponse.json({ ok: true, attempted });
}
