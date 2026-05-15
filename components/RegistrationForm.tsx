"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { registrationSchema, type RegistrationInput } from "@/lib/schemas";
import { calculateGST } from "@/lib/gst";
import { getFairPricing } from "@/lib/pricing";
import { formatINR, formatUSD } from "@/lib/utils";
import type { Fair } from "@/types";

const STEPS = ["University", "Contact", "Payment"] as const;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const;

export function RegistrationForm({ fair }: { fair: Fair }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pricing = getFairPricing(fair);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fair_id: fair.id,
      university_country: "USA",
      booth_type: "Standard",
      number_of_reps: 1,
      payment_currency: "USD",
      is_gst_registered: false,
      terms_accepted: false,
    },
    mode: "onTouched",
  });

  const currency = watch("payment_currency");
  const state = watch("state");
  const isGSTRegistered = watch("is_gst_registered");

  async function goNext() {
    let fields: (keyof RegistrationInput)[];
    if (step === 0) {
      fields = [
        "university_name",
        "university_country",
        "university_website",
        "booth_type",
        "number_of_reps",
      ];
    } else {
      fields = [
        "contact_name",
        "contact_title",
        "contact_email",
        "contact_phone",
        "special_requests",
        "terms_accepted",
      ];
    }
    const ok = await trigger(fields);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function onSubmit(data: RegistrationInput) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || "Registration failed. Please try again.");
      }
      router.push(`/invoice/${body.registrationId}`);
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Something went wrong. Please retry."
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <input type="hidden" {...register("fair_id")} />

      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-3 text-sm">
        {STEPS.map((label, i) => {
          const isActive = i === step;
          const isDone = i < step;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                  isDone
                    ? "border-gold bg-gold text-navy"
                    : isActive
                    ? "border-navy bg-navy text-white"
                    : "border-navy/20 bg-white text-navy/50",
                ].join(" ")}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={
                  isActive ? "font-medium text-navy" : "text-navy/60"
                }
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="ml-1 h-px w-10 bg-navy/15" />
              )}
            </li>
          );
        })}
      </ol>

      {step === 0 && (
        <div className="space-y-5">
          <Input
            label="University Name"
            required
            placeholder="e.g. Arizona State University"
            error={errors.university_name?.message}
            {...register("university_name")}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label="Country"
              required
              error={errors.university_country?.message}
              {...register("university_country")}
            >
              <option value="USA">United States</option>
              <option value="Canada">Canada</option>
              <option value="UK">United Kingdom</option>
              <option value="Other">Other</option>
            </Select>
            <Input
              label="University Website"
              placeholder="https://www.university.edu"
              error={errors.university_website?.message}
              {...register("university_website")}
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-navy">
              Booth Type <span className="text-gold-500">*</span>
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="cursor-pointer rounded-md border border-navy/15 bg-white p-4 transition-colors has-[input:checked]:border-navy has-[input:checked]:bg-navy/[0.03]">
                <div className="flex items-start justify-between">
                  <span className="font-medium text-navy">Standard</span>
                  <input
                    type="radio"
                    value="Standard"
                    className="accent-navy"
                    {...register("booth_type")}
                  />
                </div>
                <p className="mt-1 text-xs text-navy/60">
                  Table, signage, and listing in fair directory
                </p>
                <p className="mt-2 text-sm font-semibold text-navy">
                  {formatUSD(pricing.priceUSD)}
                  {pricing.isEarlyBird && (
                    <span className="ml-2 text-xs font-medium uppercase tracking-wide text-green-600">
                      Early Bird
                    </span>
                  )}
                </p>
              </label>
              <label className="cursor-pointer rounded-md border border-navy/15 bg-white p-4 transition-colors has-[input:checked]:border-navy has-[input:checked]:bg-navy/[0.03]">
                <div className="flex items-start justify-between">
                  <span className="font-medium text-navy">Premium</span>
                  <input
                    type="radio"
                    value="Premium"
                    className="accent-navy"
                    {...register("booth_type")}
                  />
                </div>
                <p className="mt-1 text-xs text-navy/60">
                  Larger booth, branded backdrop, premium directory placement
                </p>
                <p className="mt-2 text-sm font-semibold text-navy">
                  {formatUSD(pricing.priceUSD)}
                  <span className="ml-1 text-xs font-normal text-navy/60">
                    (contact us for upgrade pricing)
                  </span>
                </p>
              </label>
            </div>
            {errors.booth_type?.message && (
              <p className="mt-1.5 text-xs text-red-600">
                {errors.booth_type.message}
              </p>
            )}
          </fieldset>

          <Input
            type="number"
            label="Number of Representatives"
            required
            min={1}
            max={2}
            error={errors.number_of_reps?.message}
            hint="Maximum 2 representatives per counter (per IAES T&C §2.3). Additional counters available — contact us."
            {...register("number_of_reps", { valueAsNumber: true })}
          />

          <div className="flex items-center justify-end pt-2">
            <Button type="button" size="lg" onClick={goNext}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Full Name"
              required
              placeholder="Dr. Jane Smith"
              error={errors.contact_name?.message}
              {...register("contact_name")}
            />
            <Input
              label="Title / Designation"
              placeholder="Director of International Admissions"
              error={errors.contact_title?.message}
              {...register("contact_title")}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              type="email"
              label="Email Address"
              required
              placeholder="admissions@university.edu"
              hint="Invoice and confirmation will be sent here."
              error={errors.contact_email?.message}
              {...register("contact_email")}
            />
            <Input
              type="tel"
              label="Phone Number"
              placeholder="+1 555 123 4567"
              error={errors.contact_phone?.message}
              {...register("contact_phone")}
            />
          </div>
          <Textarea
            label="Special Requests"
            placeholder="Dietary preferences, AV requirements, breakout-session interest..."
            error={errors.special_requests?.message}
            {...register("special_requests")}
          />

          {/* Terms & Conditions acceptance */}
          <div className="rounded-xl border border-navy/10 bg-[#F5F7FA] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy">
              Terms &amp; Conditions
            </p>
            <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-navy/10 bg-white p-4 text-xs leading-relaxed text-navy/70">
              <p className="font-semibold text-navy">Key points:</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>Maximum 2 representatives per counter space.</li>
                <li>Second counter table charged at USD 2,000 extra.</li>
                <li>
                  Transportation provided for official visits only — not
                  personal travel.
                </li>
                <li>
                  No refund for no-shows or cancellations less than 15 days
                  before the Fair.
                </li>
                <li>
                  Cancellations: 15–29 days = 25% refund; 30–59 days = 50%;
                  60+ days = 75%.
                </li>
                <li>GST amounts are non-refundable once invoiced.</li>
                <li>IAES liability limited to the registration fee paid.</li>
                <li>
                  Force Majeure: IAES not liable for unscheduled closures or
                  cancellations.
                </li>
                <li>
                  Student data obtained via QR scan is for admissions use only.
                </li>
                <li>
                  Disputes governed by Ahmedabad courts under Indian law.
                </li>
              </ul>
              <p className="mt-3 text-navy/55">
                Full terms:{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy underline"
                >
                  fairs.iaesgujarat.org/terms
                </a>
              </p>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                {...register("terms_accepted")}
                className="mt-0.5 h-4 w-4 accent-navy"
              />
              <span className="text-sm leading-snug text-navy/85">
                I confirm that I have read, understood, and agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-navy underline underline-offset-2"
                >
                  Terms &amp; Conditions
                </a>{" "}
                of the IAES U.S. University Education Outreach Tour &amp; Fair
                2026. I confirm I am authorised to enter this agreement on
                behalf of my institution.
              </span>
            </label>
            {errors.terms_accepted?.message && (
              <p className="mt-2 text-xs text-red-600">
                {errors.terms_accepted.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(0)}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button type="button" size="lg" onClick={goNext}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <Step3Payment
          register={register}
          errors={errors}
          currency={currency}
          state={state ?? null}
          isGSTRegistered={!!isGSTRegistered}
          setValue={setValue}
          fair={fair}
          boothPriceUSD={pricing.priceUSD}
          submitting={submitting}
          submitError={submitError}
          onBack={() => setStep(1)}
        />
      )}
    </form>
  );
}

// ----------------------------------------------------------------
// Step 3 — Payment currency + (conditional) billing details + live preview
// ----------------------------------------------------------------
type RHFRegister = ReturnType<typeof useForm<RegistrationInput>>["register"];
type RHFErrors = ReturnType<typeof useForm<RegistrationInput>>["formState"]["errors"];
type RHFSetValue = ReturnType<typeof useForm<RegistrationInput>>["setValue"];

function Step3Payment({
  register,
  errors,
  currency,
  state,
  isGSTRegistered,
  setValue,
  fair,
  boothPriceUSD,
  submitting,
  submitError,
  onBack,
}: {
  register: RHFRegister;
  errors: RHFErrors;
  currency: "USD" | "INR" | undefined;
  state: string | null;
  isGSTRegistered: boolean;
  setValue: RHFSetValue;
  fair: Fair;
  /** Tier-aware booth fee in USD (early-bird if active, else standard). */
  boothPriceUSD: number;
  submitting: boolean;
  submitError: string | null;
  onBack: () => void;
}) {
  void fair;
  const [forex, setForex] = useState<{ rate: number; date: string } | null>(null);
  const [forexLoading, setForexLoading] = useState(false);

  useEffect(() => {
    if (currency !== "INR" || forex) return;
    let cancelled = false;
    setForexLoading(true);
    fetch("/api/forex")
      .then((r) => r.json())
      .then((d: { rate: number; date: string }) => {
        if (!cancelled) setForex(d);
      })
      .catch(() => {
        if (!cancelled) setForex({ rate: 83.5, date: new Date().toISOString().slice(0, 10) });
      })
      .finally(() => {
        if (!cancelled) setForexLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currency, forex]);

  // Reset GSTIN when toggling off "GST registered"
  useEffect(() => {
    if (!isGSTRegistered) setValue("gstin", "");
  }, [isGSTRegistered, setValue]);

  const preview = useMemo(() => {
    if (currency !== "INR" || !forex) return null;
    return calculateGST(
      "INR",
      boothPriceUSD,
      forex.rate,
      state,
      isGSTRegistered
    );
  }, [currency, forex, boothPriceUSD, state, isGSTRegistered]);

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-navy">
          How would you like to pay? <span className="text-gold-500">*</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="cursor-pointer rounded-md border border-navy/15 bg-white p-4 transition-colors has-[input:checked]:border-navy has-[input:checked]:bg-navy/[0.03]">
            <div className="flex items-start justify-between">
              <span className="font-medium text-navy">Pay in USD</span>
              <input
                type="radio"
                value="USD"
                className="accent-navy"
                {...register("payment_currency")}
              />
            </div>
            <p className="mt-1 text-xs text-navy/60">
              Recommended for US offices. No GST applicable (export of service).
            </p>
            <p className="mt-2 text-sm font-semibold text-navy">
              {formatUSD(boothPriceUSD)}
            </p>
          </label>
          <label className="cursor-pointer rounded-md border border-navy/15 bg-white p-4 transition-colors has-[input:checked]:border-navy has-[input:checked]:bg-navy/[0.03]">
            <div className="flex items-start justify-between">
              <span className="font-medium text-navy">Pay in INR</span>
              <input
                type="radio"
                value="INR"
                className="accent-navy"
                {...register("payment_currency")}
              />
            </div>
            <p className="mt-1 text-xs text-navy/60">
              For India-based offices. GST applicable as per Indian tax law.
            </p>
            <p className="mt-2 text-sm font-semibold text-navy">
              {forex
                ? formatINR(boothPriceUSD * forex.rate)
                : "Fetching today's rate..."}
              <span className="ml-1 text-xs font-normal text-navy/60">+ GST</span>
            </p>
          </label>
        </div>
        {errors.payment_currency?.message && (
          <p className="mt-1.5 text-xs text-red-600">
            {errors.payment_currency.message}
          </p>
        )}
      </fieldset>

      {currency === "INR" && (
        <>
          <div className="space-y-5 rounded-md border border-navy/10 bg-cream/40 p-5">
            <div>
              <h3 className="font-serif text-lg font-semibold text-navy">
                Billing Information
              </h3>
              <p className="text-xs text-navy/60">
                As per GST records. This goes on your tax invoice.
              </p>
            </div>

            <Input
              label="Legal Entity Name"
              required
              placeholder="e.g. ABC Education Services Pvt Ltd"
              error={errors.legal_name?.message}
              {...register("legal_name")}
            />
            <Textarea
              label="Billing Address"
              required
              error={errors.billing_address?.message}
              {...register("billing_address")}
            />
            <div className="grid gap-5 sm:grid-cols-3">
              <Input
                label="City"
                required
                error={errors.city?.message}
                {...register("city")}
              />
              <Select
                label="State"
                required
                error={errors.state?.message}
                {...register("state")}
              >
                <option value="">Select state…</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <Input
                label="PIN Code"
                required
                placeholder="380009"
                inputMode="numeric"
                error={errors.pin_code?.message}
                {...register("pin_code")}
              />
            </div>
            <Input
              label="PAN Number"
              required
              placeholder="ABCDE1234F"
              error={errors.pan_number?.message}
              {...register("pan_number")}
            />

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-navy">
                Are you GST registered in India?
              </legend>
              <div className="flex items-center gap-6 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    value="true"
                    className="accent-navy"
                    checked={isGSTRegistered === true}
                    onChange={() => setValue("is_gst_registered", true)}
                  />
                  Yes
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    value="false"
                    className="accent-navy"
                    checked={isGSTRegistered === false}
                    onChange={() => setValue("is_gst_registered", false)}
                  />
                  No
                </label>
              </div>
            </fieldset>

            {isGSTRegistered && (
              <Input
                label="GSTIN"
                required
                placeholder="24ABCDE1234F1Z5"
                error={errors.gstin?.message}
                {...register("gstin")}
              />
            )}
          </div>

          {/* Live preview */}
          <div className="rounded-md border border-gold/40 bg-white p-5">
            <p className="text-xs uppercase tracking-wider text-gold-600">
              Estimated Invoice Amount
            </p>
            {forexLoading || !forex || !preview ? (
              <p className="mt-2 text-sm text-navy/60">
                Fetching today&rsquo;s forex rate…
              </p>
            ) : (
              <div className="mt-3 space-y-1.5 text-sm">
                <Row label="Booth Fee" value={formatUSD(boothPriceUSD)} />
                <Row
                  label="Forex Rate"
                  value={`1 USD = ₹${forex.rate.toFixed(2)}`}
                  sub={`as of ${formatForexTimestamp(forex.date)} IST — locked at invoice generation`}
                />
                <Row label="Base Amount" value={formatINR(preview.baseAmountINR)} />
                {preview.gstType === "IGST" && (
                  <Row label="IGST @ 18%" value={formatINR(preview.igstAmount)} />
                )}
                {preview.gstType === "CGST_SGST" && (
                  <>
                    <Row label="CGST @ 9%" value={formatINR(preview.cgstAmount)} />
                    <Row label="SGST @ 9%" value={formatINR(preview.sgstAmount)} />
                  </>
                )}
                {!preview.gstType ||
                  (preview.gstType === "NONE" && (
                    <Row label="GST" value="Not applicable" />
                  ))}
                <div className="mt-2 border-t border-navy/10 pt-2">
                  <Row
                    label="Total"
                    value={formatINR(preview.totalAmountINR)}
                    bold
                  />
                </div>
                <p className="pt-2 text-xs text-navy/50">
                  Final amount is locked at invoice generation.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {submitError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={submitting}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          type="submit"
          variant="gold"
          size="lg"
          loading={submitting}
        >
          {submitting ? "Submitting..." : "Generate Invoice"}{" "}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  bold,
}: {
  label: string;
  value: string;
  sub?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className={bold ? "font-semibold text-navy" : "text-navy/65"}>
        {label}
      </span>
      <span className="text-right">
        <span
          className={
            bold ? "font-serif text-lg font-semibold text-navy" : "text-navy"
          }
        >
          {value}
        </span>
        {sub && <span className="block text-[10px] text-navy/50">{sub}</span>}
      </span>
    </div>
  );
}

function formatForexTimestamp(isoDate: string): string {
  // The forex API returns a YYYY-MM-DD date string. We append "the rest"
  // from the user's clock so the timestamp reflects when the page rendered.
  const day = new Date(isoDate);
  const date = day.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  return `${date}, ${time}`;
}
