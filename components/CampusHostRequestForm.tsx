"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  campusHostRequestSchema,
  type CampusHostRequestInput,
  STUDY_PROGRAM_OPTIONS,
} from "@/lib/schemas";
import type { Fair } from "@/types";

export function CampusHostRequestForm({ fair }: { fair: Fair }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampusHostRequestInput>({
    resolver: zodResolver(campusHostRequestSchema),
    defaultValues: {
      fair_id: fair.id,
      study_programs: [],
      terms_accepted: false,
    },
    mode: "onTouched",
  });

  const studyPrograms = watch("study_programs") || [];
  const termsAccepted = watch("terms_accepted");

  function toggleProgram(value: string) {
    const current = studyPrograms;
    if (current.includes(value)) {
      setValue(
        "study_programs",
        current.filter((v) => v !== value),
        { shouldValidate: true, shouldTouch: true }
      );
    } else {
      setValue("study_programs", [...current, value], {
        shouldValidate: true,
        shouldTouch: true,
      });
    }
  }

  async function onSubmit(data: CampusHostRequestInput) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/register/campus-host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || "Could not submit. Please try again.");
      }
      setSubmitted(true);
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Something went wrong. Please retry."
      );
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-serif text-2xl font-semibold text-navy">
          Request received
        </h2>
        <p className="mt-2 text-sm text-navy/70">
          Thank you. The IAES team will review your campus-visit request and
          contact you on the email and phone you provided to confirm
          feasibility, dates, and the participating universities.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-navy hover:text-gold-600"
        >
          &larr; Back to home
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register("fair_id")} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Name of the Institution Official"
          required
          placeholder="Dr. Asha Patel"
          error={errors.official_name?.message}
          {...register("official_name")}
        />
        <Input
          label="Name of the Institution"
          required
          placeholder="e.g. Nirma University"
          error={errors.institution_name?.message}
          {...register("institution_name")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          type="email"
          label="Official Email"
          required
          placeholder="director@institution.edu.in"
          error={errors.official_email?.message}
          {...register("official_email")}
        />
        <Input
          type="tel"
          label="Phone Number"
          required
          placeholder="+91 98255 93262"
          error={errors.official_phone?.message}
          {...register("official_phone")}
        />
      </div>

      <Input
        label="Website"
        placeholder="https://institution.edu.in"
        error={errors.website?.message}
        {...register("website")}
      />

      <CheckboxGroup
        label="Study programs your students are interested in"
        options={STUDY_PROGRAM_OPTIONS}
        selected={studyPrograms}
        onToggle={toggleProgram}
        error={errors.study_programs?.message as string | undefined}
        required
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Approx. participants"
          required
          placeholder="e.g. 100+"
          hint="A rough number is fine — helps us size the visit."
          error={errors.approx_participants?.message}
          {...register("approx_participants")}
        />
        <Input
          label="Proposed date and time"
          required
          placeholder="e.g. 2nd week of August 2026, afternoon"
          hint="A preferred window — we'll confirm the final schedule."
          error={errors.proposed_datetime?.message}
          {...register("proposed_datetime")}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-navy/10 bg-cream/40 p-4 text-sm text-navy">
        <input
          type="checkbox"
          className="mt-0.5 accent-navy"
          checked={!!termsAccepted}
          onChange={(e) =>
            setValue("terms_accepted", e.target.checked, {
              shouldValidate: true,
              shouldTouch: true,
            })
          }
        />
        <span>
          I have read and accept the{" "}
          <Link
            href="/terms"
            target="_blank"
            className="font-medium text-gold-600 underline underline-offset-2"
          >
            terms &amp; conditions
          </Link>
          . I confirm I am authorised to make this request on behalf of my
          institution.
          {errors.terms_accepted?.message && (
            <span className="mt-1 block text-xs text-red-600">
              {errors.terms_accepted.message}
            </span>
          )}
        </span>
      </label>

      {submitError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="gold" size="lg" loading={submitting}>
          {submitting ? "Submitting..." : "Submit Request"}{" "}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
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
