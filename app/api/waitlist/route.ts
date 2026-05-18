import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend } from "@/lib/resend";
import { WaitlistConfirmationEmail } from "@/emails/WaitlistConfirmationEmail";

export const runtime = "nodejs";

// v12 spec uses educationfair@ for the between-fairs waitlist (distinct
// from the default transactional sender).
const WAITLIST_FROM = "IAES Education Fairs <educationfair@iaesgujarat.org>";
const WAITLIST_REPLY_TO = "educationfair@iaesgujarat.org";

const schema = z.object({
  university_name: z.string().trim().min(1).max(200),
  contact_name: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(200),
  country: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "University name and a valid email are required." },
      { status: 400 }
    );
  }

  const universityName = parsed.data.university_name;
  const contactName = parsed.data.contact_name || null;
  const country = parsed.data.country || "USA";
  const email = parsed.data.email.toLowerCase().trim();

  // Service role: RLS denies anon writes on these tables (migration 0017).
  const supabase = createAdminClient();

  // Past participants are already on the mailing list — show them the
  // "already registered" state, not a fresh success.
  const { data: existingRecipient } = await supabase
    .from("announcement_recipients")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingRecipient) {
    return NextResponse.json({ alreadySignedUp: true });
  }

  const { data: existingWaitlist } = await supabase
    .from("waitlist_signups")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingWaitlist) {
    return NextResponse.json({ alreadySignedUp: true });
  }

  // Context: which concluded fair was showing when they signed up.
  const { data: lastFair } = await supabase
    .from("fairs")
    .select("id")
    .eq("status", "COMPLETED")
    .order("concluded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: waitlistError } = await supabase
    .from("waitlist_signups")
    .insert({
      university_name: universityName,
      contact_name: contactName,
      email,
      country,
      source_fair_id: lastFair?.id ?? null,
    });

  if (waitlistError) {
    if (waitlistError.code === "23505") {
      return NextResponse.json({ alreadySignedUp: true });
    }
    return NextResponse.json(
      { error: "Could not save your signup. Please try again." },
      { status: 500 }
    );
  }

  // Add straight to the mailing list so the next announcement reaches
  // them with no admin import. ignoreDuplicates: a race that inserted
  // the email elsewhere is harmless.
  await supabase
    .from("announcement_recipients")
    .upsert(
      {
        email,
        name: contactName || universityName,
        organization: universityName,
        source: "NEWSLETTER",
        is_active: true,
      },
      { onConflict: "email", ignoreDuplicates: true }
    );

  await supabase
    .from("waitlist_signups")
    .update({ merged_to_recipients: true })
    .eq("email", email);

  // Confirmation email — must NOT fail the signup. Log and continue.
  try {
    if (process.env.RESEND_API_KEY) {
      const resend = getResend();
      await resend.emails.send({
        from: WAITLIST_FROM,
        replyTo: WAITLIST_REPLY_TO,
        to: email,
        subject: "You're on the list — IAES Education Fairs",
        react: WaitlistConfirmationEmail({
          universityName,
          contactName,
        }),
      });
    }
  } catch (e) {
    console.error("Waitlist confirmation email failed:", e);
  }

  return NextResponse.json({ success: true });
}
