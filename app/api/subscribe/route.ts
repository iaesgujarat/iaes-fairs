import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/phoneE164";
import { registerWhatsAppContact } from "@/lib/whatsappNotify";

export const runtime = "nodejs";

const schema = z.object({
  role: z.enum(["university", "student"]),
  full_name: z.string().min(2, "Please enter your name."),
  email: z.string().email("Enter a valid email."),
  phone: z.string().optional().nullable(),
  whatsapp_consent: z.boolean().optional(),
  email_consent: z.boolean().optional(),
  // university
  university_name: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  preferred_months: z.array(z.string()).optional().nullable(),
  // student
  city: z.string().optional().nullable(),
  study_level: z.string().optional().nullable(),
  preferred_countries: z.array(z.string()).optional().nullable(),
  field_of_interest: z.string().optional().nullable(),
  intake_year: z.string().optional().nullable(),
});

const clean = (v: string | null | undefined) => {
  const t = v?.trim();
  return t ? t : null;
};

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid details." },
      { status: 422 }
    );
  }
  const d = parsed.data;

  // Students are India-based → default CC; universities are intl → none.
  const phoneE164 = toE164(d.phone, d.role === "student" ? "IN" : undefined);
  const row = {
    role: d.role,
    full_name: d.full_name.trim(),
    email: d.email.trim().toLowerCase(),
    phone_e164: phoneE164,
    whatsapp_consent: !!d.whatsapp_consent,
    email_consent: d.email_consent !== false,
    university_name: d.role === "university" ? clean(d.university_name) : null,
    country: d.role === "university" ? clean(d.country) : null,
    job_title: d.role === "university" ? clean(d.job_title) : null,
    preferred_months:
      d.role === "university" && d.preferred_months?.length
        ? d.preferred_months
        : null,
    city: d.role === "student" ? clean(d.city) : null,
    study_level: d.role === "student" ? clean(d.study_level) : null,
    preferred_countries:
      d.role === "student" && d.preferred_countries?.length
        ? d.preferred_countries
        : null,
    field_of_interest: d.role === "student" ? clean(d.field_of_interest) : null,
    intake_year: d.role === "student" ? clean(d.intake_year) : null,
    source: "subscribe_page",
    last_seen_at: new Date().toISOString(),
  };

  const supabase = createAdminClient();

  // Dedupe on (lower email, role): refresh an existing lead rather than
  // pile up duplicates. Never resurrect an unsubscribed row's is_active.
  try {
    const { data: existing } = await supabase
      .from("announcement_leads")
      .select("id")
      .eq("email", row.email)
      .eq("role", row.role)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("announcement_leads")
        .update(row)
        .eq("id", existing.id);
    } else {
      const { error } = await supabase.from("announcement_leads").insert(row);
      if (error) {
        return NextResponse.json(
          { error: "Could not save. Please try again." },
          { status: 500 }
        );
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Could not save. Please try again." },
      { status: 500 }
    );
  }

  // Mirror a WA-consented number into the shared registry so v21
  // broadcasts (and STOP handling) treat it like any other contact.
  if (row.whatsapp_consent) {
    await registerWhatsAppContact(supabase, {
      rawPhone: d.phone,
      defaultCc: d.role === "student" ? "IN" : undefined,
      name: row.full_name,
      audience: d.role,
      country: row.country,
      fairId: null,
      consent: true,
    });
  }

  return NextResponse.json({ ok: true });
}
