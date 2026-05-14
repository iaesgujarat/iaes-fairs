import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(
      `*,
       fair:fairs(name, fair_date),
       invoices(invoice_number, total_amount_inr, status),
       payments(payment_status, amount_paid_inr, paid_at)`
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const format = new URL(req.url).searchParams.get("format");
  if (format === "csv") {
    const headers = [
      "Registered At",
      "University",
      "Country",
      "Website",
      "Contact Name",
      "Contact Title",
      "Email",
      "Phone",
      "Fair",
      "Fair Date",
      "Booth Type",
      "Reps",
      "Status",
      "Invoice No.",
      "Invoice Total (INR)",
      "Payment Status",
      "Amount Paid (INR)",
      "Paid At",
      "Special Requests",
    ];

    const lines = [headers.join(",")];
    for (const r of data || []) {
      const fair = (r as { fair?: { name?: string; fair_date?: string } })
        .fair;
      const invoice = (r as { invoices?: Array<{ invoice_number?: string; total_amount_inr?: number; status?: string }> })
        .invoices?.[0];
      const payment = (r as { payments?: Array<{ payment_status?: string; amount_paid_inr?: number; paid_at?: string }> })
        .payments?.find((p) => p.payment_status === "success") ||
        (r as { payments?: Array<{ payment_status?: string; amount_paid_inr?: number; paid_at?: string }> })
          .payments?.[0];

      lines.push(
        [
          r.created_at,
          r.university_name,
          r.university_country,
          r.university_website,
          r.contact_name,
          r.contact_title,
          r.contact_email,
          r.contact_phone,
          fair?.name,
          fair?.fair_date,
          r.booth_type,
          r.number_of_reps,
          r.status,
          invoice?.invoice_number,
          invoice?.total_amount_inr,
          payment?.payment_status,
          payment?.amount_paid_inr,
          payment?.paid_at,
          r.special_requests,
        ]
          .map(escapeCsv)
          .join(",")
      );
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="iaes-registrations-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ registrations: data });
}
