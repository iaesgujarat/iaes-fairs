"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { registrationSchema, type RegistrationInput } from "@/lib/schemas";
import { formatINR } from "@/lib/utils";
import type { Fair } from "@/types";

const STEPS = ["University", "Contact"] as const;

export function RegistrationForm({ fair }: { fair: Fair }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fair_id: fair.id,
      university_country: "USA",
      booth_type: "Standard",
      number_of_reps: 1,
    },
    mode: "onTouched",
  });

  async function goNext() {
    const ok = await trigger([
      "university_name",
      "university_country",
      "university_website",
      "booth_type",
      "number_of_reps",
    ]);
    if (ok) setStep(1);
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
      <ol className="flex items-center gap-3 text-sm">
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
                  {formatINR(fair.booth_price_inr)} + GST
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
                  {formatINR(fair.booth_price_inr)} + GST
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
            max={5}
            error={errors.number_of_reps?.message}
            hint="Up to 5 staff members may attend on behalf of your institution."
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

          {submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(0)}
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
      )}
    </form>
  );
}
