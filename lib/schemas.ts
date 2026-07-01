import { z } from "zod";

// ---- regexes from the v2 spec --------------------------------
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ---- phone: international, format-tolerant, anti-filler -------
// Reps register from US / India / anywhere — do NOT force an
// India-specific pattern. Accept +, country code, spaces, (), -, .
// but reject obvious junk typed just to clear the field.
const PHONE_ALLOWED = /^[+]?[0-9()\-.\s]{6,40}$/;
function isPlausiblePhone(v: string): boolean {
  if (!PHONE_ALLOWED.test(v)) return false;
  const digits = v.replace(/\D/g, "");
  // E.164 caps at 15 digits; ~7 is the shortest real national number.
  if (digits.length < 7 || digits.length > 15) return false;
  // Filler guards: all-identical (0000000000) or a straight run
  // (1234567890 / 0123456789 / 9876543210).
  if (/^(\d)\1+$/.test(digits)) return false;
  if ("01234567890123456789".includes(digits)) return false;
  if ("09876543210987654321".includes(digits)) return false;
  return true;
}

// ---- university website: accept a bare domain OR a full URL ---
function websiteHostIsValid(v: string): boolean {
  const host = v.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  return /^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(host);
}

// ---- Step 1: University -------------------------------------
export const step1Schema = z
  .object({
    university_name: z.string().min(2, "University name is required.").max(200),
    university_country: z.string().min(2).max(80),
    university_website: z
      .string()
      .trim()
      .min(1, "University website or domain is required.")
      .max(255)
      .refine(
        websiteHostIsValid,
        "Enter a valid website or domain (e.g. asu.edu or https://www.asu.edu)."
      )
      .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`)),
    booth_type: z.enum(["Standard", "Premium"], {
      message: "Please pick a booth type.",
    }),
    // v14 — client signals the chosen tier. Server trusts only
    // "PREMIUM" to switch to the premium path; STANDARD/EARLYBIRD is
    // always (re)computed server-side from the live fair pricing.
    pricing_tier: z
      .enum(["EARLYBIRD", "STANDARD", "PREMIUM"])
      .optional(),
    // v15 — itinerary stop ids the university will attend. Server
    // validates each id is a public stop of the fair before persisting.
    event_optins: z.array(z.string()).optional(),
    // Legacy mirror — kept in sync with total_reps server-side.
    number_of_reps: z
      .number({ message: "Reps must be a number." })
      .int()
      .min(1)
      .max(6),
    // v7 booth fields
    total_tables: z
      .number({ message: "Pick how many tables you need." })
      .int()
      .min(1, "At least 1 table.")
      .max(3, "Maximum 3 tables per university."),
    total_reps: z
      .number({ message: "Pick how many representatives are attending." })
      .int()
      .min(2, "At least 2 representatives.")
      .max(6, "Maximum 6 representatives (2 per table)."),
  })
  .superRefine((val, ctx) => {
    const maxAllowed = val.total_tables * 2;
    if (val.total_reps > maxAllowed) {
      ctx.addIssue({
        code: "custom",
        path: ["total_reps"],
        message: `With ${val.total_tables} table(s), max reps is ${maxAllowed} (2 per table).`,
      });
    }
  });

// ---- Step 2: Contact + Terms acceptance ---------------------
export const step2Schema = z.object({
  contact_name: z.string().min(2, "Full name is required.").max(120),
  contact_title: z.string().max(120).optional(),
  contact_email: z.email("Please enter a valid email address."),
  contact_phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .max(40)
    .refine(
      isPlausiblePhone,
      "Enter a valid phone number with country code (e.g. +1 562 985 4111)."
    ),
  special_requests: z.string().max(2000).optional(),
  terms_accepted: z
    .boolean()
    .refine((v) => v === true, {
      message: "You must accept the Terms & Conditions to proceed.",
    }),
});

export const TERMS_VERSION = "2026.1";

// ---- Billing details (INR path only) -------------------------
export const billingDetailsSchema = z.object({
  legal_name: z.string().min(2, "Legal entity name is required.").max(200),
  billing_address: z.string().min(5, "Billing address is required.").max(500),
  city: z.string().min(2, "City is required.").max(120),
  state: z.string().min(2, "Select a state.").max(80),
  pin_code: z
    .string()
    .regex(/^[1-9][0-9]{5}$/, "PIN must be a 6-digit Indian postal code."),
  pan_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PAN_REGEX, "PAN must be 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)."),
  is_gst_registered: z.boolean().default(false),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN_REGEX, "GSTIN must be 15 characters in the standard format.")
    .optional()
    .or(z.literal("")),
});

// ---- Step 3: Payment ----------------------------------------
// payment_currency is required; if INR, billing fields are required.
export const step3Schema = z
  .object({
    payment_currency: z.enum(["USD", "INR"], {
      message: "Choose a payment currency.",
    }),
  })
  .and(
    z.object({
      // Always present in form state, but only validated when INR is picked.
      legal_name: z.string().optional(),
      billing_address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pin_code: z.string().optional(),
      pan_number: z.string().optional(),
      is_gst_registered: z.boolean().optional(),
      gstin: z.string().optional(),
      // v19 — Mode A "Attn:" recipient (USD / university pays directly).
      // Legal entity stays the university; this only re-addresses the
      // document. bill_to_self=false means "address it to someone else".
      bill_to_self: z.boolean().optional(),
      bill_to_attn_name: z.string().max(120).optional(),
      bill_to_attn_title: z.string().max(120).optional(),
      bill_to_attn_email: z
        .email("Enter a valid email for the invoice recipient.")
        .optional()
        .or(z.literal("")),
      bill_to_cc: z.boolean().optional(),
    })
  )
  .superRefine((val, ctx) => {
    // v19 — USD path: if addressing the invoice to someone else, the
    // recipient name + a valid email are required.
    if (val.payment_currency === "USD" && val.bill_to_self === false) {
      if (!val.bill_to_attn_name || val.bill_to_attn_name.trim().length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["bill_to_attn_name"],
          message: "Enter the name this invoice should be addressed to.",
        });
      }
      if (!val.bill_to_attn_email) {
        ctx.addIssue({
          code: "custom",
          path: ["bill_to_attn_email"],
          message: "Enter the recipient's email address.",
        });
      }
    }

    if (val.payment_currency !== "INR") return;

    const billing = {
      legal_name: val.legal_name,
      billing_address: val.billing_address,
      city: val.city,
      state: val.state,
      pin_code: val.pin_code,
      pan_number: val.pan_number,
      is_gst_registered: !!val.is_gst_registered,
      gstin: val.gstin,
    };
    const parsed = billingDetailsSchema.safeParse(billing);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ ...issue, path: issue.path });
      }
    }
    if (billing.is_gst_registered && !billing.gstin) {
      ctx.addIssue({
        code: "custom",
        path: ["gstin"],
        message: "GSTIN is required when GST registered.",
      });
    }
  });

// ---- Full registration payload (server-side) -----------------
export const registrationSchema = z
  .object({
    fair_id: z.uuid({ error: "Missing fair selection." }),
    // Optional WhatsApp opt-in. The registration form's checkbox is a
    // fast-follow; the server persists + acts on this the moment the
    // form starts sending it. Absent -> treated as no consent.
    whatsapp_consent: z.boolean().optional(),
  })
  .and(step1Schema)
  .and(step2Schema)
  .and(step3Schema);

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type BillingDetailsInput = z.infer<typeof billingDetailsSchema>;

// ============================================================================
// Institution registration (v3 — free, 4 steps, no payment)
// ============================================================================

export const INSTITUTION_TYPES = [
  "School",
  "Junior College",
  "Degree College",
  "University",
  "Coaching Institute",
  "Other",
] as const;

export const COURSE_OPTIONS = [
  "Science (PCM / PCB)",
  "Commerce",
  "Arts / Humanities",
  "Engineering (BE/BTech)",
  "Management (BBA/MBA)",
  "Law",
  "Medicine",
  "Other",
] as const;

export const YEAR_SEMESTER_OPTIONS = [
  "Std 11",
  "Std 12",
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "Postgraduate",
] as const;

export const FIELD_OF_INTEREST_OPTIONS = [
  "Computer Science / IT",
  "Engineering",
  "Business / Management",
  "Health Sciences",
  "Arts & Design",
  "Social Sciences",
  "Law",
  "Other",
] as const;

export const BUDGET_RANGE_OPTIONS = [
  "Under ₹30 Lakhs/year",
  "₹30–50 Lakhs/year",
  "₹50–80 Lakhs/year",
  "Above ₹80 Lakhs/year",
  "Open / Scholarship seeking",
] as const;

export const instStep1Schema = z.object({
  institution_name: z
    .string()
    .min(2, "Institution name is required.")
    .max(200),
  institution_type: z.enum(INSTITUTION_TYPES, {
    message: "Pick an institution type.",
  }),
  city: z.string().min(2, "City is required.").max(120),
  state: z.string().min(2, "Select a state.").max(80),
  website: z
    .union([z.url("Please enter a valid URL (https://...)."), z.literal("")])
    .optional(),
});

export const instStep2Schema = z.object({
  contact_name: z.string().min(2, "Contact name is required.").max(120),
  designation: z.string().min(2, "Designation is required.").max(120),
  email: z.email("Please enter a valid email address."),
  phone: z
    .string()
    .min(6, "Phone number is required.")
    .max(40),
});

export const instStep3Schema = z.object({
  expected_student_count: z
    .number({ message: "Enter expected student count." })
    .int("Whole numbers only.")
    .min(1, "At least 1 student.")
    .max(5000, "That seems unusually high — please confirm."),
  courses: z.array(z.string()).min(1, "Select at least one course."),
  year_semester: z
    .array(z.string())
    .min(1, "Select at least one year/semester."),
  fields_of_interest: z
    .array(z.string())
    .min(1, "Select at least one field of interest."),
  budget_range: z.enum(BUDGET_RANGE_OPTIONS, {
    message: "Select a budget range.",
  }),
});

export const instStep4Schema = z.object({
  whatsapp_consent: z.boolean(),
  email_consent: z.boolean(),
  data_sharing_consent: z.boolean(),
});

export const institutionRegistrationSchema = z
  .object({
    fair_id: z.uuid({ error: "Missing fair selection." }),
  })
  .and(instStep1Schema)
  .and(instStep2Schema)
  .and(instStep3Schema)
  .and(instStep4Schema);

export type InstitutionRegistrationInput = z.infer<
  typeof institutionRegistrationSchema
>;

// ============================================================================
// Campus Host Request (v9 — Indian HEI invites foreign university reps to
// visit their campus. Free, single page, admin-activated, no payment.)
// ============================================================================

export const STUDY_PROGRAM_OPTIONS = [
  "Engineering & Technology",
  "Management & Business",
  "Computer Science / IT",
  "Health & Medical Sciences",
  "Sciences",
  "Arts, Humanities & Social Sciences",
  "Law",
  "Design & Architecture",
  "Other",
] as const;

export const campusHostRequestSchema = z.object({
  fair_id: z.uuid({ error: "Missing fair selection." }),
  official_name: z
    .string()
    .min(2, "Name of the institution official is required.")
    .max(120),
  official_email: z.email("Please enter a valid official email address."),
  official_phone: z
    .string()
    .min(6, "Phone number is required.")
    .max(40),
  institution_name: z
    .string()
    .min(2, "Name of the institution is required.")
    .max(200),
  website: z
    .union([z.url("Please enter a valid URL (https://...)."), z.literal("")])
    .optional(),
  study_programs: z
    .array(z.string())
    .min(1, "Select at least one study program."),
  approx_participants: z
    .string()
    .min(1, "Approx. participants is required.")
    .max(40),
  proposed_datetime: z
    .string()
    .min(3, "Proposed date and time is required.")
    .max(200),
  terms_accepted: z
    .boolean()
    .refine((v) => v === true, {
      message: "Please accept the terms to continue.",
    }),
});

export type CampusHostRequestInput = z.infer<typeof campusHostRequestSchema>;

// ============================================================================
// Student self-registration (v4 — free, single page, no payment)
// ============================================================================

export const STUDENT_COURSE_OPTIONS = [
  "Science (PCM / PCB)",
  "Commerce",
  "Arts / Humanities",
  "Engineering (BE/BTech)",
  "Management (BBA/MBA)",
  "Law",
  "Medicine",
  "Other",
] as const;

export const STUDENT_SEMESTER_OPTIONS = [
  "Std 11",
  "Std 12",
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "Postgraduate",
] as const;

export const STUDENT_FIELD_OPTIONS = [
  "Computer Science / IT",
  "Engineering",
  "Business / Management",
  "Health Sciences",
  "Arts & Design",
  "Social Sciences",
  "Law",
  "Other",
] as const;

export const STUDENT_COUNTRY_OPTIONS = [
  "USA",
  "Canada",
  "UK",
  "Australia",
  "Germany",
  "Other",
] as const;

export const studentPassSchema = z.object({
  fair_id: z.uuid({ error: "Missing fair selection." }),
  // v24 — per-event registration. When the student registers via a
  // campus link, this is the itinerary stop they're signing up for; the
  // server validates it belongs to the fair. `also_open_fair` adds a
  // second signup for the fair's public Open Fair stop.
  itinerary_stop_id: z.uuid().optional(),
  also_open_fair: z.boolean().optional(),
  full_name: z.string().min(2, "Full name is required.").max(120),
  email: z.email("Please enter a valid email address."),
  phone: z.string().min(6, "Phone number is required.").max(40),
  institution_name: z
    .string()
    .min(2, "Institution name is required.")
    .max(200),
  current_course: z.enum(STUDENT_COURSE_OPTIONS, {
    message: "Select your current course.",
  }),
  current_semester: z.enum(STUDENT_SEMESTER_OPTIONS, {
    message: "Select your current year/semester.",
  }),
  field_of_interest: z
    .array(z.string())
    .min(1, "Select at least one field of interest."),
  budget_range: z.enum(BUDGET_RANGE_OPTIONS).optional().or(z.literal("")),
  english_exam: z.string().max(80).optional(),
  preferred_countries: z.array(z.string()),
  whatsapp_consent: z.boolean(),
  email_consent: z.boolean(),
  data_sharing_consent: z.boolean(),
});

export type StudentPassInput = z.infer<typeof studentPassSchema>;

export { PAN_REGEX, GSTIN_REGEX };
