export type FairStatus = "active" | "inactive";

export interface Fair {
  id: string;
  name: string;
  city: string;
  venue: string | null;
  fair_date: string;
  registration_deadline: string | null;
  booth_price_usd: number;
  booth_price_inr: number;
  max_universities: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export type RegistrationStatus =
  | "pending"
  | "invoice_sent"
  | "paid"
  | "confirmed"
  | "cancelled";

export type BoothType = "Standard" | "Premium";

export interface Registration {
  id: string;
  fair_id: string;
  university_name: string;
  university_country: string;
  university_website: string | null;
  contact_name: string;
  contact_title: string | null;
  contact_email: string;
  contact_phone: string | null;
  booth_type: BoothType;
  number_of_reps: number;
  status: RegistrationStatus;
  special_requests: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = "unpaid" | "paid" | "cancelled";

export interface Invoice {
  id: string;
  registration_id: string;
  invoice_number: string;
  amount_inr: number;
  amount_usd: number | null;
  gst_percent: number;
  gst_amount_inr: number;
  total_amount_inr: number;
  currency: "INR" | "USD";
  due_date: string | null;
  pdf_url: string | null;
  status: InvoiceStatus;
  issued_at: string;
}

export type PaymentStatus = "initiated" | "success" | "failed" | "refunded";

export interface Payment {
  id: string;
  invoice_id: string;
  registration_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount_paid_inr: number;
  payment_method: string | null;
  payment_status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface RegistrationWithJoins extends Registration {
  fair: Fair;
  invoice: Invoice | null;
  payment: Payment | null;
}

export interface RegistrationFormData {
  fair_id: string;
  university_name: string;
  university_country: string;
  university_website?: string;
  contact_name: string;
  contact_title?: string;
  contact_email: string;
  contact_phone?: string;
  booth_type: BoothType;
  number_of_reps: number;
  special_requests?: string;
}
