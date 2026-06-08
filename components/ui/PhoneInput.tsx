"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DIAL_CODES,
  dialForIso,
  isoForUniversityCountry,
  buildE164,
} from "@/lib/dialCodes";

interface Props {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  /** University country from the form — preselects the dial code. */
  country?: string | null;
  /** Receives the combined E.164 value ("" when empty/invalid). */
  onChange: (e164: string) => void;
}

/**
 * Phone field with an explicit country-code picker. Guarantees the value
 * handed back is full E.164 (+<country><number>) so a number can never be
 * submitted without a country code — which is what silently dropped reps
 * from WhatsApp before (a bare national number normalized to null). The
 * dial code follows the selected university country until the user picks
 * one manually.
 */
export function PhoneInput({
  label,
  required,
  error,
  hint,
  country,
  onChange,
}: Props) {
  const [iso, setIso] = React.useState(() => isoForUniversityCountry(country));
  const [userPickedIso, setUserPickedIso] = React.useState(false);
  const [national, setNational] = React.useState("");

  // Track the latest onChange without making it a re-emit trigger.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Follow the university country until the rep picks a code themselves.
  React.useEffect(() => {
    if (!userPickedIso) setIso(isoForUniversityCountry(country));
  }, [country, userPickedIso]);

  // Emit E.164 whenever either part changes.
  React.useEffect(() => {
    onChangeRef.current(buildE164(dialForIso(iso), national));
  }, [iso, national]);

  const fieldBase =
    "rounded-md border bg-white text-sm text-navy transition-colors focus:outline-none focus:ring-2";
  const fieldState = error
    ? "border-red-400 focus:ring-red-300"
    : "border-navy/15 focus:border-navy focus:ring-gold/30";

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-navy">
          {label}
          {required && <span className="ml-0.5 text-gold-500">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        <select
          aria-label="Country code"
          value={iso}
          onChange={(e) => {
            setUserPickedIso(true);
            setIso(e.target.value);
          }}
          className={cn(fieldBase, fieldState, "w-36 shrink-0 px-2 py-2.5")}
        >
          {DIAL_CODES.map((d) => (
            <option key={d.iso} value={d.iso}>
              +{d.dial} {d.name}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="tel"
          value={national}
          onChange={(e) => setNational(e.target.value)}
          placeholder="98765 43210"
          aria-invalid={!!error}
          className={cn(
            fieldBase,
            fieldState,
            "block w-full px-3 py-2.5 placeholder:text-navy/40"
          )}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-xs text-navy/50">{hint}</p>}
    </div>
  );
}
