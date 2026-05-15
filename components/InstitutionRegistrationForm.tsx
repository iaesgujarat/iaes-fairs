"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  institutionRegistrationSchema,
  type InstitutionRegistrationInput,
  INSTITUTION_TYPES,
  COURSE_OPTIONS,
  YEAR_SEMESTER_OPTIONS,
  FIELD_OF_INTEREST_OPTIONS,
  BUDGET_RANGE_OPTIONS,
} from "@/lib/schemas";
import type { Fair } from "@/types";

const STEPS = ["Institution", "Contact", "Students", "Consents"] as const;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const;

export function InstitutionRegistrationForm({ fair }: { fair: Fair }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InstitutionRegistrationInput>({
    resolver: zodResolver(institutionRegistrationSchema),
    defaultValues: {
      fair_id: fair.id,
      courses: [],
      year_semester: [],
      fields_of_interest: [],
      whatsapp_consent: false,
      email_consent: true,
      data_sharing_consent: false,
    },
    mode: "onTouched",
  });

  const courses = watch("courses") || [];
  const yearSemester = watch("year_semester") || [];
  const fieldsOfInterest = watch("fields_of_interest") || [];
  const whatsappConsent = watch("whatsapp_consent");
  const emailConsent = watch("email_consent");
  const dataSharingConsent = watch("data_sharing_consent");

  function toggleInArray(
    name: "courses" | "year_semester" | "fields_of_interest",
    current: string[],
    value: string
  ) {
    if (current.includes(value)) {
      setValue(
        name,
        current.filter((v) => v !== value),
        { shouldValidate: true, shouldTouch: true }
      );
    } else {
      setValue(name, [...current, value], {
        shouldValidate: true,
        shouldTouch: true,
      });
    }
  }

  async function goNext() {
    let fields: (keyof InstitutionRegistrationInput)[];
    if (step === 0) {
      fields = [
        "institution_name",
        "institution_type",
        "city",
        "state",
        "website",
      ];
    } else if (step === 1) {
      fields = ["contact_name", "designation", "email", "phone"];
    } else {
      fields = [
        "expected_student_count",
        "courses",
        "year_semester",
        "fields_of_interest",
        "budget_range",
      ];
    }
    const ok = await trigger(fields);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function onSubmit(data: InstitutionRegistrationInput) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/register/institution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || "Registration failed. Please try again.");
      }
      router.push(`/confirmation/institution/${body.registrationId}`);
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
                className={isActive ? "font-medium text-navy" : "text-navy/60"}
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

      {/* Step 1: Institution */}
      {step === 0 && (
        <div className="space-y-5">
          <Input
            label="Institution Name"
            required
            placeholder="e.g. The Riverside School"
            error={errors.institution_name?.message}
            {...register("institution_name")}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label="Institution Type"
              required
              error={errors.institution_type?.message}
              {...register("institution_type")}
            >
              <option value="">Select type…</option>
              {INSTITUTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Input
              label="Website"
              placeholder="https://institution.in"
              error={errors.website?.message}
              {...register("website")}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
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
          </div>
          <div className="flex items-center justify-end pt-2">
            <Button type="button" size="lg" onClick={goNext}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Contact */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Contact Name"
              required
              placeholder="Mrs. Asha Patel"
              error={errors.contact_name?.message}
              {...register("contact_name")}
            />
            <Input
              label="Designation"
              required
              placeholder="Principal / Career Counsellor"
              error={errors.designation?.message}
              {...register("designation")}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              type="email"
              label="Email Address"
              required
              placeholder="counsellor@institution.in"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              type="tel"
              label="Phone / WhatsApp"
              required
              placeholder="+91 98255 93262"
              error={errors.phone?.message}
              {...register("phone")}
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep(0)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button type="button" size="lg" onClick={goNext}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Students */}
      {step === 2 && (
        <div className="space-y-6">
          <Input
            type="number"
            label="Expected Number of Students Attending"
            required
            min={1}
            error={errors.expected_student_count?.message}
            hint="Best estimate is fine — we'll plan logistics around it."
            {...register("expected_student_count", { valueAsNumber: true })}
          />

          <CheckboxGroup
            label="Current Course / Stream"
            options={COURSE_OPTIONS}
            selected={courses}
            onToggle={(v) => toggleInArray("courses", courses, v)}
            error={errors.courses?.message as string | undefined}
            required
          />

          <CheckboxGroup
            label="Year / Semester"
            options={YEAR_SEMESTER_OPTIONS}
            selected={yearSemester}
            onToggle={(v) => toggleInArray("year_semester", yearSemester, v)}
            error={errors.year_semester?.message as string | undefined}
            required
          />

          <CheckboxGroup
            label="Fields of Interest in USA"
            options={FIELD_OF_INTEREST_OPTIONS}
            selected={fieldsOfInterest}
            onToggle={(v) =>
              toggleInArray("fields_of_interest", fieldsOfInterest, v)
            }
            error={errors.fields_of_interest?.message as string | undefined}
            required
          />

          <Select
            label="Budget Range"
            required
            error={errors.budget_range?.message}
            {...register("budget_range")}
          >
            <option value="">Select budget range…</option>
            {BUDGET_RANGE_OPTIONS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Select>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button type="button" size="lg" onClick={goNext}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Consents */}
      {step === 3 && (
        <div className="space-y-5">
          <fieldset className="space-y-3 rounded-md border border-navy/10 bg-cream/40 p-5">
            <legend className="px-1 text-sm font-medium text-navy">
              Updates &amp; Sharing
            </legend>
            <ConsentRow
              checked={!!whatsappConsent}
              onChange={(v) =>
                setValue("whatsapp_consent", v, { shouldTouch: true })
              }
              label="Send us WhatsApp updates about the fair"
              hint="Itinerary changes, briefing pack, day-of logistics."
            />
            <ConsentRow
              checked={!!emailConsent}
              onChange={(v) =>
                setValue("email_consent", v, { shouldTouch: true })
              }
              label="Send us email updates"
              hint="Default ON — required for confirmation + reminders."
            />
            <ConsentRow
              checked={!!dataSharingConsent}
              onChange={(v) =>
                setValue("data_sharing_consent", v, { shouldTouch: true })
              }
              label="I consent to sharing student interest details with participating US universities at the fair"
              hint="Helps universities prepare relevant material for your students."
            />
          </fieldset>

          {submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(2)}
              disabled={submitting}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button type="submit" variant="gold" size="lg" loading={submitting}>
              {submitting ? "Submitting..." : "Register Free"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
  error,
  required,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-navy">
        {label}
        {required && <span className="ml-0.5 text-gold-500">*</span>}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const isOn = selected.includes(opt);
          return (
            <label
              key={opt}
              className={[
                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                isOn
                  ? "border-navy bg-navy/[0.03] text-navy"
                  : "border-navy/15 bg-white text-navy/85 hover:border-navy/30",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={isOn}
                onChange={() => onToggle(opt)}
                className="accent-navy"
              />
              {opt}
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}

function ConsentRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-navy">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 accent-navy"
      />
      <span>
        {label}
        {hint && <span className="block text-xs text-navy/55">{hint}</span>}
      </span>
    </label>
  );
}
