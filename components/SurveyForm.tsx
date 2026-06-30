"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface ExistingFeedback {
  overall_rating: number | null;
  leads_rating: number | null;
  organization_rating: number | null;
  recommend_rating: number | null;
  what_went_well: string | null;
  what_to_improve: string | null;
  additional_comments: string | null;
}

const RATING_QUESTIONS: {
  key: keyof Pick<
    ExistingFeedback,
    | "overall_rating"
    | "leads_rating"
    | "organization_rating"
    | "recommend_rating"
  >;
  label: string;
  hint: string;
}[] = [
  {
    key: "overall_rating",
    label: "Overall, how was your experience at the fair?",
    hint: "1 = poor · 5 = excellent",
  },
  {
    key: "leads_rating",
    label: "Quality and number of student leads you collected",
    hint: "1 = poor · 5 = excellent",
  },
  {
    key: "organization_rating",
    label: "Event organisation — venue, logistics, on-ground support",
    hint: "1 = poor · 5 = excellent",
  },
  {
    key: "recommend_rating",
    label: "How likely are you to join a future IAES fair?",
    hint: "1 = not likely · 5 = very likely",
  },
];

function Stars({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} out of 5`}
          aria-pressed={value === n}
          className={`flex h-10 w-10 items-center justify-center rounded-md border text-lg transition-colors ${
            value !== null && n <= value
              ? "border-gold-500 bg-gold-500 text-navy"
              : "border-navy/15 bg-white text-navy/30 hover:border-navy/40"
          }`}
        >
          &#9733;
        </button>
      ))}
    </div>
  );
}

export function SurveyForm({
  registrationId,
  existing,
}: {
  registrationId: string;
  existing: ExistingFeedback | null;
}) {
  const [ratings, setRatings] = useState<Record<string, number | null>>({
    overall_rating: existing?.overall_rating ?? null,
    leads_rating: existing?.leads_rating ?? null,
    organization_rating: existing?.organization_rating ?? null,
    recommend_rating: existing?.recommend_rating ?? null,
  });
  const [wentWell, setWentWell] = useState(existing?.what_went_well ?? "");
  const [improve, setImprove] = useState(existing?.what_to_improve ?? "");
  const [comments, setComments] = useState(
    existing?.additional_comments ?? ""
  );

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const hasAnything =
    Object.values(ratings).some((v) => v !== null) ||
    wentWell.trim() ||
    improve.trim() ||
    comments.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!hasAnything) {
      setErr("Please rate the fair or leave a comment before submitting.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/survey/${registrationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ratings,
          what_went_well: wentWell,
          what_to_improve: improve,
          additional_comments: comments,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Could not submit.");
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-2xl">🙏</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-navy">
          Thank you for your feedback!
        </h2>
        <p className="mt-2 text-sm text-navy/70">
          We read every response — it directly shapes how we run the next
          fair. You can revisit this link anytime to update your answers.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      {existing && (
        <div className="rounded-lg border border-navy/10 bg-cream/40 px-4 py-3 text-xs text-navy/70">
          You&rsquo;ve already submitted feedback — your previous answers are
          loaded below. Submitting again will update them.
        </div>
      )}

      {RATING_QUESTIONS.map((q) => (
        <div key={q.key}>
          <p className="text-sm font-medium text-navy">{q.label}</p>
          <p className="mb-2 mt-0.5 text-xs text-navy/55">{q.hint}</p>
          <Stars
            value={ratings[q.key]}
            onChange={(v) => setRatings((r) => ({ ...r, [q.key]: v }))}
          />
        </div>
      ))}

      <Textarea
        label="What went well?"
        placeholder="The things you'd want us to keep doing…"
        value={wentWell}
        onChange={(e) => setWentWell(e.target.value)}
      />
      <Textarea
        label="What could we improve?"
        placeholder="Anything that would make the next fair better for you…"
        value={improve}
        onChange={(e) => setImprove(e.target.value)}
      />
      <Textarea
        label="Any other comments or suggestions? (optional)"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
      />

      {err && <p className="text-sm text-red-600">{err}</p>}

      <Button
        type="submit"
        variant="gold"
        size="lg"
        loading={busy}
        className="w-full"
      >
        {existing ? "Update my feedback" : "Submit feedback"}
      </Button>
    </form>
  );
}
