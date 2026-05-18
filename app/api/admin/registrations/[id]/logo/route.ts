import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { LogoReceivedEmail } from "@/emails/LogoReceivedEmail";

export const runtime = "nodejs";

const BUCKET = "fair-assets";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Admin uploads a premium university's logo (received by email).
 * multipart/form-data, field `file`. Stores in private bucket
 * `fair-assets` at logos/<regId>/logo.png, marks the registration
 * logo-received, emails the university. Bucket must be created
 * manually in Supabase (private).
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 400 }
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided." },
      { status: 400 }
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "File must be an image (PNG preferred)." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 20 MB)." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: reg } = await supabase
    .from("registrations")
    .select(
      "id, pricing_tier, contact_name, contact_email, university_name, fair:fairs(name)"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!reg) {
    return NextResponse.json({ error: "Registration not found." }, {
      status: 404,
    });
  }
  if (reg.pricing_tier !== "PREMIUM") {
    return NextResponse.json(
      { error: "Logo upload is only for premium registrations." },
      { status: 400 }
    );
  }

  const path = `logos/${params.id}/logo.png`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "image/png",
      upsert: true,
    });
  if (upErr) {
    return NextResponse.json(
      {
        error:
          upErr.message ||
          "Upload failed. Confirm the 'fair-assets' bucket exists.",
      },
      { status: 500 }
    );
  }

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, ONE_YEAR);

  const { error: updErr } = await supabase
    .from("registrations")
    .update({
      backdrop_png_url: signed?.signedUrl ?? null,
      backdrop_received: true,
      backdrop_received_at: new Date().toISOString(),
    })
    .eq("id", params.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Confirmation email — non-blocking.
  try {
    if (process.env.RESEND_API_KEY) {
      const fair = Array.isArray(reg.fair) ? reg.fair[0] : reg.fair;
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: reg.contact_email,
        subject: `✅ Logo Confirmed — ${fair?.name ?? "IAES Fair"}`,
        react: LogoReceivedEmail({
          contactName: reg.contact_name,
          universityName: reg.university_name,
          fairName: fair?.name ?? "IAES Fair",
        }),
      });
    }
  } catch (e) {
    console.error("LogoReceived email failed:", e);
  }

  return NextResponse.json({
    success: true,
    url: signed?.signedUrl ?? null,
  });
}
