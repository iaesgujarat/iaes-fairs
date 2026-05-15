"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  studentPassSchema,
  type StudentPassInput,
  STUDENT_COURSE_OPTIONS,
  STUDENT_SEMESTER_OPTIONS,
  STUDENT_FIELD_OPTIONS,
  STUDENT_COUNTRY_OPTIONS,
  BUDGET_RANGE_OPTIONS,
} from "@/lib/schemas";
import type { Fair } from "@/types";

export function StudentRegisterForm({ fair }: { fair: Fair }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState<{
    passUuid: string;
    passNumber: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentPassInput>({
    resolver: zodResolver(studentPassSchema),
    defaultValues: {
      fair_id: fair.id,
      field_of_interest: [],
      preferred_countries: [],
      whatsapp_consent: false,
      email_consent: true,
      data_sharing_consent: false,
    },
    mode: "onTouched",
  });

  const fields = watch("field_of_interest") || [];
  const countries = watch("preferred_countries") || [];
  const whatsappConsent = watch("whatsapp_consent");
  const emailConsent = watch("email_consent");
  const dataSharingConsent = watch("data_sharing_consent");

  function toggle(
    name: "field_of_interest" | "preferred_countries",
    current: string[],
    v: string
  ) {
    if (current.includes(v)) {
      setValue(
        name,
        current.filter((x) => x !== v),
        { shouldValidate: true, shouldTouch: true }
      );
    } else {
      setValue(name, [...current, v], {
        shouldValidate: true,
        shouldTouch: true,
      });
    }
  }

  async function onSubmit(data: StudentPassInput) {
    setSubmitting(true);
    setSubmitError(null);
    setAlreadyRegistered(null);
    try {
      const res = await fetch("/api/student/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || "Registration failed. Please try again.");
      }
      if (body.alreadyRegistered) {
        setAlreadyRegistered({
          passUuid: body.passUuid,
          passNumber: body.passNumber,
        });
        setSubmitting(false);
        return;
      }
      router.push(`/pass/${body.passUuid}`);
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Something went wrong. Please retry."
      );
      setSubmitting(false);
    }
  }

  if (alreadyRegistered) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-navy/80">
          A pass was already issued to this email.
        </p>
        <p className="font-serif text-2xl font-semibold text-navy">
          {alreadyRegistered.passNumber}
        </p>
        <p className="text-xs text-navy/60">
          We&rsquo;ve re-sent your pass to your inbox.
        </p>
        <a
          href={`/pass/${alreadyRegistered.passUuid}`}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-navy/90"
        >
          Open My Pass <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("fair_id")} />

      <Input
        label="Full Name"
        required
        placeholder="Rahul Sharma"
        error={errors.full_name?.message}
        {...register("full_name")}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          type="email"
          label="Email Address"
          required
          placeholder="rahul@email.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          type="tel"
          label="Phone / WhatsApp"
          required
          placeholder="+91 98765 43210"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>
      <Input
        label="Institution Name"
        required
        placeholder="Gujarat University"
        error={errors.institution_name?.message}
        {...register("institution_name")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Current Course"
          required
          error={errors.current_course?.message}
          {...register("current_course")}
        >
          <option value="">Select course…</option>
          {STUDENT_COURSE_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Select
          label="Current Semester / Year"
          required
          error={errors.current_semester?.message}
          {...register("current_semester")}
        >
          <option value="">Select year…</option>
          {STUDENT_SEMESTER_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      <CheckboxGroup
        label="Field of Interest in USA"
        options={STUDENT_FIELD_OPTIONS}
        selected={fields}
        onToggle={(v) => toggle("field_of_interest", fields, v)}
        required
        error={errors.field_of_interest?.message as string | undefined}
      />

      <Select
        label="Budget Range"
        error={errors.budget_range?.message}
        {...register("budget_range")}
      >
        <option value="">Optional…</option>
        {BUDGET_RANGE_OPTIONS.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </Select>

      <Input
        label="English Exam"
        placeholder="IELTS 6.5 or Not attempted"
        hint="Optional"
        error={errors.english_exam?.message}
        {...register("english_exam")}
      />

      <CheckboxGroup
        label="Preferred Countries"
        options={STUDENT_COUNTRY_OPTIONS}
        selected={countries}
        onToggle={(v) => toggle("preferred_countries", countries, v)}
        error={errors.preferred_countries?.message as string | undefined}
      />

      <fieldset className="space-y-3 rounded-md border border-navy/10 bg-cream/40 p-5">
        <legend className="px-1 text-sm font-medium text-navy">Consents</legend>
        <ConsentRow
          checked={!!whatsappConsent}
          onChange={(v) => setValue("whatsapp_consent", v)}
          label="Send me WhatsApp updates about the fair"
        />
        <ConsentRow
          checked={!!emailConsent}
          onChange={(v) => setValue("email_consent", v)}
          label="Send me email updates"
        />
        <ConsentRow
          checked={!!dataSharingConsent}
          onChange={(v) => setValue("data_sharing_consent", v)}
          label="I agree to share my profile with participating US universities"
          hint="Required for universities to see your contact details when they scan your pass."
        />
      </fieldset>

      {submitError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <Button
        type="submit"
        variant="gold"
        size="lg"
        loading={submitting}
        className="w-full"
      >
        {submitting ? "Generating pass..." : "Get My Pass"}{" "}
        <ArrowRight className="h-4 w-4" />
      </Button>
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
  onToggle: (v: string) => void;
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
