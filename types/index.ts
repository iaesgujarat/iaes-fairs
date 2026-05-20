export type Currency = "USD" | "INR";

export type FairStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "REGISTRATION_CLOSED"
  | "ONGOING"
  | "COMPLETED"
  | "ARCHIVED"
  | "CANCELLED";

export interface Fair {
  id: string;
  name: string;
  city: string;
  venue: string | null;
  fair_date: string;
  registration_deadline: string | null;
  booth_price_usd: number;
  max_universities: number;
  description: string | null;
  is_active: boolean;
  created_at: string;

  // ---- v3 additions (optional until DB migration adds the columns) ----
  fair_date_start?: string;
  fair_date_end?: string;
  arrive_by?: string;
  depart_after?: string;
  price_standard_usd?: number;
  price_standard_inr?: number;
  price_earlybird_usd?: number;
  price_earlybird_inr?: number;
  earlybird_deadline?: string;
  includes?: string[];

  // ---- v7 booth pricing (optional until DB migration adds the columns) ----
  price_extra_table_usd?: number;
  price_extra_rep_usd?: number;
  max_tables_per_university?: number;

  // ---- v14 premium booth + add-on pool (optional until 0019) ----
  price_premium_usd?: number | null;
  price_premium_inr?: number | null;
  premium_slots_total?: number;
  premium_deadline?: string | null;
  addon_tables_pool?: number;
  max_addon_tables_per_reg?: number;

  // ---- v8 deferred payment gateway (optional until migration) ----
  payment_gateway_active?: boolean;
  gateway_activated_at?: string | null;
  gateway_activation_note?: string | null;

  // ---- v9 campus host requests (optional until migration) ----
  campus_host_requests_active?: boolean;
  campus_host_activated_at?: string | null;
  campus_host_activation_note?: string | null;

  // ---- v6 lifecycle (optional until DB migration adds the columns) ----
  status?: FairStatus;
  announced_at?: string | null;
  registration_closed_at?: string | null;
  started_at?: string | null;
  concluded_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  postfair_data_sent_at?: string | null;
  itinerary_sent_at?: string | null;

  // ---- v17 follow-up — admin-editable hero stat (replaces the
  // hardcoded "1,000+ students" in FairDetails). NULL → UI "TBC".
  expected_footfall?: string | null;

  // ---- v11 itinerary (populated when fetched alongside the fair) ----
  itinerary?: FairItineraryStop[];

  // ---- v13 auto-conclude (optional until migration 0018) ----
  auto_concluded?: boolean;
  thankyou_emails_sent_at?: string | null;

  // ---- post-fair stats (cached at conclusion by v13; UI hides
  // the row gracefully when absent / pre-migration) ----
  stat_universities_participated?: number | null;
  stat_students_attended?: number | null;
  stat_booth_scans?: number | null;
  stat_cities_visited?: number | null;
  stat_cached_at?: string | null;
}

export interface RegistrationEventOptin {
  id: string;
  registration_id: string;
  itinerary_stop_id: string;
  created_at: string;
}

export interface WaitlistSignup {
  id: string;
  university_name: string;
  contact_name: string | null;
  email: string;
  country: string;
  source_fair_id: string | null;
  merged_to_recipients: boolean;
  created_at: string;
}

export type ItineraryEventType =
  | "CAMPUS_VISIT"
  | "OPEN_FAIR"
  | "TRAVEL"
  | "FREE";

export interface FairItineraryStop {
  id: string;
  fair_id: string;
  day_number: number;
  event_date: string; // ISO date
  event_type: ItineraryEventType;
  institution_name: string | null;
  venue_name: string | null;
  city: string;
  address: string | null;
  start_time: string | null; // "10:00"
  end_time: string | null; // "13:00"
  is_main_fair: boolean;
  is_confirmed: boolean;
  is_public: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FairStatusLog {
  id: string;
  fair_id: string;
  from_status: FairStatus | null;
  to_status: FairStatus;
  changed_by: string;
  note: string | null;
  changed_at: string;
}

export type AnnouncementSource =
  | "PAST_PARTICIPANT"
  | "MANUAL"
  | "CSV_UPLOAD"
  | "NEWSLETTER";

export type AnnouncementEmailType =
  | "ANNOUNCEMENT"
  | "EARLYBIRD_REMINDER"
  | "REGISTRATION_REMINDER"
  | "ITINERARY"
  | "PAYMENT_REMINDER"
  | "POSTFAIR_DATA"
  | "CANCELLATION";

export interface AnnouncementRecipient {
  id: string;
  email: string;
  name: string | null;
  organization: string | null;
  source: AnnouncementSource;
  is_active: boolean;
  unsubscribed_at: string | null;
  created_at: string;
}

export interface AnnouncementSend {
  id: string;
  fair_id: string;
  recipient_id: string;
  email_type: AnnouncementEmailType;
  sent_at: string;
  resend_email_id: string | null;
}

// ---------- v7: booth pricing ----------
export interface BoothConfig {
  totalTables: number;
  totalReps: number;
}

export interface BoothPricing {
  basePriceUSD: number;
  addonTables: number;
  addonReps: number;
  addonTablesCostUSD: number;
  addonRepsCostUSD: number;
  addonTotalCostUSD: number;
  grandTotalUSD: number;
}

export type RegistrationStatus =
  | "registered"      // v8: gateway off, awaiting activation
  | "payment_open"    // v8: gateway activated, payment link sent
  | "pending"         // legacy
  | "invoice_sent"    // legacy
  | "paid"
  | "confirmed"
  | "cancelled";

export type BoothType = "Standard" | "Premium";

export type PricingTier = "STANDARD" | "EARLYBIRD" | "PREMIUM";

// v14 premium-slot / add-on-pool status (from DB views; counts only).
export interface PremiumSlotStatus {
  fair_id: string;
  premium_slots_total: number;
  slots_taken: number;
  slots_remaining: number;
  isSoldOut: boolean;
}

export interface AddonTableStatus {
  fair_id: string;
  addon_tables_pool: number;
  tables_taken: number;
  tables_remaining: number;
  isPoolExhausted: boolean;
}

export interface FairTableSummary {
  fair_id: string;
  premium_tables_in_use: number;
  standard_base_tables: number;
  addon_tables_taken: number;
  addon_tables_pool: number;
  total_tables_in_use: number;
}

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
  total_tables: number;
  total_reps: number;
  addon_tables: number;
  addon_reps: number;
  addon_cost_usd: number;
  payment_currency: Currency;
  pricing_tier: PricingTier;
  status: RegistrationStatus;
  special_requests: string | null;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  terms_version: string | null;
  // ---- v14 premium logo/backdrop (optional until 0019) ----
  backdrop_png_url?: string | null;
  backdrop_received?: boolean;
  backdrop_received_at?: string | null;
  logo_reminder_sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type InstitutionType =
  | "School"
  | "Junior College"
  | "Degree College"
  | "University"
  | "Coaching Institute"
  | "Other";

export type InstitutionStatus = "registered" | "confirmed" | "cancelled";

export interface InstitutionRegistration {
  id: string;
  fair_id: string;
  institution_name: string;
  institution_type: InstitutionType;
  city: string;
  state: string;
  website: string | null;
  contact_name: string;
  designation: string;
  email: string;
  phone: string;
  expected_student_count: number;
  courses: string[];
  year_semester: string[];
  fields_of_interest: string[];
  budget_range: string | null;
  whatsapp_consent: boolean;
  email_consent: boolean;
  data_sharing_consent: boolean;
  status: InstitutionStatus;
  created_at: string;
}

export interface BillingDetails {
  id: string;
  registration_id: string;
  legal_name: string;
  billing_address: string;
  city: string;
  state: string;
  pin_code: string;
  pan_number: string;
  is_gst_registered: boolean;
  gstin: string | null;
  created_at: string;
}

export type GSTType = "NONE" | "IGST" | "CGST_SGST";

export type InvoiceStatus = "unpaid" | "paid" | "cancelled";

export type InvoiceType = "PROFORMA" | "TAX";

export interface Invoice {
  id: string;
  registration_id: string;
  /** NULL on proforma invoices — only TAX invoices consume the sequence. */
  invoice_number: string | null;
  invoice_type: InvoiceType;
  /** Set on every proforma; copied onto the matching TAX invoice for paper trail. */
  proforma_reference: string | null;

  payment_currency: Currency;
  forex_rate_used: number | null;
  forex_rate_date: string | null;
  // forex provenance (optional until migration 0020)
  forex_rate_source?: string | null;
  forex_rate_time?: string | null;

  base_amount_usd: number;
  base_amount_inr: number | null;

  gst_type: GSTType;
  cgst_percent: number;
  cgst_amount: number;
  sgst_percent: number;
  sgst_amount: number;
  igst_percent: number;
  igst_amount: number;

  total_amount_usd: number | null;
  total_amount_inr: number | null;

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
  amount_paid: number;
  currency: Currency;
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
  billing: BillingDetails | null;
  payment: Payment | null;
}

// ---------- v4: Student pass + scanner ----------
export interface FairStudentPass {
  id: string;
  pass_uuid: string;
  pass_number: string;
  fair_id: string;
  institution_registration_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  institution_name: string;
  current_course: string | null;
  current_semester: string | null;
  english_exam: string | null;
  field_of_interest: string[];
  budget_range: string | null;
  preferred_countries: string[];
  whatsapp_consent: boolean;
  email_consent: boolean;
  data_sharing_consent: boolean;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
}

export interface FairScan {
  id: string;
  pass_uuid: string;
  fair_id: string;
  university_registration_id: string;
  rep_notes: string | null;
  interested: boolean;
  scanned_at: string;
}
