"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { Fair } from "@/types";

const DEFAULT_INCLUDES = [
  "Travel to institute visits by cabs arranged by IAES",
  "Logistics and lunch during all days",
];

interface Props {
  /** Existing fair when editing; null/undefined when creating. */
  fair?: Fair | null;
  mode: "create" | "edit";
}

interface FormState {
  name: string;
  city: string;
  venue: string;
  description: string;

  fair_date_start: string;
  fair_date_end: string;
  arrive_by: string;
  depart_after: string;
  registration_deadline: string;
  earlybird_deadline: string;

  price_standard_usd: string;
  price_standard_inr: string;
  price_earlybird_usd: string;
  price_earlybird_inr: string;
  max_universities: string;

  includes: string[];
}

const USD_TO_INR_FALLBACK = 95;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fromFair(fair: Fair): FormState {
  return {
    name: fair.name || "",
    city: fair.city || "Ahmedabad",
    venue: fair.venue || "",
    description: fair.description || "",
    fair_date_start: fair.fair_date_start || fair.fair_date || "",
    fair_date_end: fair.fair_date_end || "",
    arrive_by: fair.arrive_by || "",
    depart_after: fair.depart_after || "",
    registration_deadline: fair.registration_deadline || "",
    earlybird_deadline: fair.earlybird_deadline || "",
    price_standard_usd: String(fair.price_standard_usd ?? fair.booth_price_usd ?? ""),
    price_standard_inr: String(fair.price_standard_inr ?? ""),
    price_earlybird_usd: String(fair.price_earlybird_usd ?? ""),
    price_earlybird_inr: String(fair.price_earlybird_inr ?? ""),
    max_universities: String(fair.max_universities ?? 30),
    includes: (fair.includes && fair.includes.length > 0)
      ? fair.includes
      : DEFAULT_INCLUDES,
  };
}

const EMPTY_STATE: FormState = {
  name: "",
  city: "Ahmedabad",
  venue: "",
  description: "",
  fair_date_start: "",
  fair_date_end: "",
  arrive_by: "",
  depart_after: "",
  registration_deadline: "",
  earlybird_deadline: "",
  price_standard_usd: "",
  price_standard_inr: "",
  price_earlybird_usd: "",
  price_earlybird_inr: "",
  max_universities: "30",
  includes: [...DEFAULT_INCLUDES],
};

export function FairForm({ fair, mode }: Props) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(
    fair ? fromFair(fair) : EMPTY_STATE
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  // Auto-fill INR from USD if INR is empty
  function onUsdBlur(field: "price_standard_usd" | "price_earlybird_usd") {
    const inrField =
      field === "price_standard_usd"
        ? "price_standard_inr"
        : "price_earlybird_inr";
    if (state[inrField]) return;
    const usd = Number(state[field]);
    if (!usd || !Number.isFinite(usd)) return;
    setField(inrField, String(Math.round(usd * USD_TO_INR_FALLBACK)));
  }

  function addInclude() {
    setField("includes", [...state.includes, ""]);
  }
  function setIncludeAt(i: number, v: string) {
    setField(
      "includes",
      state.includes.map((x, idx) => (idx === i ? v : x))
    );
  }
  function removeIncludeAt(i: number) {
    setField(
      "includes",
      state.includes.filter((_, idx) => idx !== i)
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Local validation
    if (!state.name || !state.venue || !state.description) {
      setError("Name, venue, and description are required.");
      return;
    }
    if (!state.fair_date_start || !state.fair_date_end) {
      setError("Fair start and end dates are required.");
      return;
    }
    if (state.fair_date_end < state.fair_date_start) {
      setError("Fair end date must be on or after the start date.");
      return;
    }
    if (!state.registration_deadline) {
      setError("Registration deadline is required.");
      return;
    }
    const psU = Number(state.price_standard_usd);
    const psI = Number(state.price_standard_inr);
    if (!psU || !psI) {
      setError("Standard price (USD and INR) is required.");
      return;
    }

    setSubmitting(true);
    const includes = state.includes.map((x) => x.trim()).filter(Boolean);

    const payload = {
      name: state.name,
      city: state.city || "Ahmedabad",
      venue: state.venue,
      description: state.description,

      fair_date_start: state.fair_date_start,
      fair_date_end: state.fair_date_end,
      fair_date: state.fair_date_start,
      arrive_by: state.arrive_by || "",
      depart_after: state.depart_after || "",
      registration_deadline: state.registration_deadline,
      earlybird_deadline: state.earlybird_deadline || "",

      booth_price_usd: psU,
      price_standard_usd: psU,
      price_standard_inr: psI,
      price_earlybird_usd: Number(state.price_earlybird_usd) || 0,
      price_earlybird_inr: Number(state.price_earlybird_inr) || 0,

      max_universities: Number(state.max_universities) || 30,
      includes,
    };

    try {
      if (mode === "create") {
        const res = await fetch("/api/admin/fairs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error || "Could not create fair.");
        router.push(`/admin/fairs/${data.fairId}`);
        router.refresh();
      } else if (fair) {
        const res = await fetch(`/api/admin/fairs/${fair.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Could not save changes.");
        router.push(`/admin/fairs/${fair.id}`);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      {/* Section 1 — basics */}
      <Section title="1. Basic details">
        <Input
          label="Fair Name"
          required
          placeholder="IAES U.S. University Education Fair — August 2026"
          value={state.name}
          onChange={(e) => setField("name", e.target.value)}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="City"
            required
            value={state.city}
            onChange={(e) => setField("city", e.target.value)}
          />
          <Input
            label="Venue"
            required
            placeholder="Hotel Courtyard by Marriott, Ahmedabad"
            value={state.venue}
            onChange={(e) => setField("venue", e.target.value)}
          />
        </div>
        <Textarea
          label="Description"
          required
          value={state.description}
          onChange={(e) => setField("description", e.target.value)}
        />
      </Section>

      {/* Section 2 — dates */}
      <Section title="2. Dates">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            type="date"
            label="Fair Start Date"
            required
            min={todayIso()}
            value={state.fair_date_start}
            onChange={(e) => setField("fair_date_start", e.target.value)}
          />
          <Input
            type="date"
            label="Fair End Date"
            required
            min={state.fair_date_start || todayIso()}
            value={state.fair_date_end}
            onChange={(e) => setField("fair_date_end", e.target.value)}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            type="date"
            label="Arrive By (recommended)"
            value={state.arrive_by}
            onChange={(e) => setField("arrive_by", e.target.value)}
          />
          <Input
            type="date"
            label="Depart After (recommended)"
            value={state.depart_after}
            onChange={(e) => setField("depart_after", e.target.value)}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            type="date"
            label="Registration Deadline"
            required
            value={state.registration_deadline}
            onChange={(e) => setField("registration_deadline", e.target.value)}
          />
          <Input
            type="date"
            label="Early Bird Deadline"
            hint="Optional. Leave blank if there's no early-bird tier."
            value={state.earlybird_deadline}
            onChange={(e) => setField("earlybird_deadline", e.target.value)}
          />
        </div>
      </Section>

      {/* Section 3 — pricing */}
      <Section title="3. Pricing">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            type="number"
            label="Standard Price (USD)"
            required
            min={1}
            step="0.01"
            value={state.price_standard_usd}
            onChange={(e) => setField("price_standard_usd", e.target.value)}
            onBlur={() => onUsdBlur("price_standard_usd")}
          />
          <Input
            type="number"
            label="Standard Price (INR)"
            required
            min={1}
            step="0.01"
            value={state.price_standard_inr}
            onChange={(e) => setField("price_standard_inr", e.target.value)}
            hint={`Auto-suggested as USD × ${USD_TO_INR_FALLBACK} — edit if needed.`}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            type="number"
            label="Early Bird Price (USD)"
            min={0}
            step="0.01"
            value={state.price_earlybird_usd}
            onChange={(e) => setField("price_earlybird_usd", e.target.value)}
            onBlur={() => onUsdBlur("price_earlybird_usd")}
            hint="Leave blank if no early bird"
          />
          <Input
            type="number"
            label="Early Bird Price (INR)"
            min={0}
            step="0.01"
            value={state.price_earlybird_inr}
            onChange={(e) => setField("price_earlybird_inr", e.target.value)}
          />
        </div>
        <Input
          type="number"
          label="Max Universities"
          min={1}
          value={state.max_universities}
          onChange={(e) => setField("max_universities", e.target.value)}
        />
      </Section>

      {/* Section 4 — includes */}
      <Section title="4. What's Included">
        <div className="space-y-2">
          {state.includes.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="e.g. Travel to institute visits by cabs arranged by IAES"
                value={item}
                onChange={(e) => setIncludeAt(i, e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeIncludeAt(i)}
                className="rounded-md p-2 text-navy/55 hover:bg-navy/5 hover:text-navy"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addInclude}
            className="inline-flex items-center gap-1.5 text-sm text-navy hover:text-gold-600"
          >
            <Plus className="h-4 w-4" /> Add item
          </button>
        </div>
      </Section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" variant="gold" size="lg" loading={submitting}>
          {mode === "create" ? "Save as draft" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <h2 className="font-serif text-lg font-semibold text-navy">{title}</h2>
      {children}
    </section>
  );
}
