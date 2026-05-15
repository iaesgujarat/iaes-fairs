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

interface InvoiceRow {
  invoice_number?: string;
  payment_currency?: string;
  total_amount_inr?: number | null;
  total_amount_usd?: number | null;
  gst_type?: string;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  status?: string;
}

interface PaymentRow {
  payment_status?: string;
  amount_paid?: number;
  currency?: string;
  paid_at?: string;
}

interface BillingRow {
  legal_name?: string;
  state?: string;
  pan_number?: string;
  gstin?: string;
  is_gst_registered?: boolean;
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
       invoices(invoice_number, payment_currency, total_amount_inr, total_amount_usd, gst_type, cgst_amount, sgst_amount, igst_amount, status),
       payments(payment_status, amount_paid, currency, paid_at),
       billing_details(legal_name, state, pan_number, gstin, is_gst_registered)`
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
      "Currency",
      "Status",
      "Invoice No.",
      "Total (USD)",
      "Total (INR)",
      "GST Type",
      "CGST",
      "SGST",
      "IGST",
      "Payment Status",
      "Amount Paid",
      "Paid Currency",
      "Paid At",
      "Legal Name",
      "State",
      "PAN",
      "GSTIN",
      "Special Requests",
    ];

    const lines = [headers.join(",")];
    for (const r of data || []) {
      const row = r as {
        created_at: string;
        university_name: string;
        university_country: string;
        university_website: string | null;
        contact_name: string;
        contact_title: string | null;
        contact_email: string;
        contact_phone: string | null;
        booth_type: string;
        number_of_reps: number;
        payment_currency: string;
        status: string;
        special_requests: string | null;
        fair?: { name?: string; fair_date?: string };
        invoices?: InvoiceRow[];
        payments?: PaymentRow[];
        billing_details?: BillingRow[];
      };
      const fair = row.fair;
      const invoice = row.invoices?.[0];
      const payment =
        row.payments?.find((p) => p.payment_status === "success") ||
        row.payments?.[0];
      const billing = row.billing_details?.[0];

      lines.push(
        [
          row.created_at,
          row.university_name,
          row.university_country,
          row.university_website,
          row.contact_name,
          row.contact_title,
          row.contact_email,
          row.contact_phone,
          fair?.name,
          fair?.fair_date,
          row.booth_type,
          row.number_of_reps,
          row.payment_currency,
          row.status,
          invoice?.invoice_number,
          invoice?.total_amount_usd ?? "",
          invoice?.total_amount_inr ?? "",
          invoice?.gst_type,
          invoice?.cgst_amount ?? "",
          invoice?.sgst_amount ?? "",
          invoice?.igst_amount ?? "",
          payment?.payment_status,
          payment?.amount_paid,
          payment?.currency,
          payment?.paid_at,
          billing?.legal_name,
          billing?.state,
          billing?.pan_number,
          billing?.gstin,
          row.special_requests,
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
