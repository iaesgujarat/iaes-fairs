"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const COUNTRIES = [
  "USA", "UK", "Canada", "Australia", "Germany", "Ireland", "New Zealand",
  "France", "Netherlands", "Singapore", "UAE", "Italy", "Sweden",
  "Switzerland", "Other",
];
const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December",
];
const STUDY_LEVELS = [
  "Undergraduate", "Postgraduate (Master's)", "PhD / Doctoral",
  "Diploma / Other",
];
const FIELDS = [
  "Business / Management", "Engineering / Technology",
  "Computer Science / IT", "Health / Medicine", "Sciences",
  "Arts / Humanities", "Law", "Other",
];
const INTAKE_YEARS = ["2026", "2027", "2028", "Later / Not sure"];

type Role = "university" | "student";

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-navy bg-navy text-white"
          : "border-navy/20 bg-white text-navy/70 hover:border-navy/40"
      }`}
    >
      {label}
    </button>
  );
}

export function SubscribeForm() {
  const [role, setRole] = useState<Role>("university");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // common
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [waConsent, setWaConsent] = useState(true);
  const [emailConsent, setEmailConsent] = useState(true);

  // university
  const [universityName, setUniversityName] = useState("");
  const [country, setCountry] = useState("");
  const [countryOther, setCountryOther] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [months, setMonths] = useState<string[]>([]);

  // student
  const [city, setCity] = useState("");
  const [studyLevel, setStudyLevel] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [countriesOther, setCountriesOther] = useState("");
  const [field, setField] = useState("");
  const [intake, setIntake] = useState("");

  const toggle = (
    list: string[],
    set: (v: string[]) => void,
    val: string
  ) =>
    set(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const prefCountries = [
        ...countries.filter((c) => c !== "Other"),
        ...(countries.includes("Other") && countriesOther.trim()
          ? [countriesOther.trim()]
          : []),
      ];
      const payload = {
        role,
        full_name: fullName,
        email,
        phone,
        whatsapp_consent: waConsent,
        email_consent: emailConsent,
        university_name: role === "university" ? universityName : undefined,
        country:
          role === "university"
            ? country === "Other"
              ? countryOther
              : country
            : undefined,
        job_title: role === "university" ? jobTitle : undefined,
        preferred_months: role === "university" ? months : undefined,
        city: role === "student" ? city : undefined,
        study_level: role === "student" ? studyLevel : undefined,
        preferred_countries: role === "student" ? prefCountries : undefined,
        field_of_interest: role === "student" ? field : undefined,
        intake_year: role === "student" ? intake : undefined,
      };
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Could not subscribe.");
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not subscribe.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-2xl">🎉</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-navy">
          You&rsquo;re on the list!
        </h2>
        <p className="mt-2 text-sm text-navy/70">
          We&rsquo;ll let you know the moment our next education fair opens —
          on {emailConsent && waConsent ? "email and WhatsApp" : emailConsent ? "email" : "WhatsApp"}.
          No spam, and you can opt out anytime.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Role toggle */}
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-navy/55">
          I am a…
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["university", "student"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                role === r
                  ? "border-navy bg-navy text-white"
                  : "border-navy/15 bg-white text-navy/70 hover:border-navy/40"
              }`}
            >
              {r === "university" ? "🎓 University / Institution" : "🧑‍🎓 Student"}
            </button>
          ))}
        </div>
      </div>

      {/* Common */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          type="email"
          label="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Input
        type="tel"
        label="WhatsApp number"
        placeholder={role === "student" ? "+91 98765 43210" : "+1 562 985 4111"}
        hint="Include your country code so we can reach you on WhatsApp."
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      {/* University-specific */}
      {role === "university" && (
        <div className="space-y-4 rounded-lg border border-navy/10 bg-cream/30 p-5">
          <Input
            label="University / Institution name"
            value={universityName}
            onChange={(e) => setUniversityName(e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">Select…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            {country === "Other" ? (
              <Input
                label="Which country?"
                value={countryOther}
                onChange={(e) => setCountryOther(e.target.value)}
              />
            ) : (
              <Input
                label="Your role / title (optional)"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            )}
          </div>
          {country === "Other" && (
            <Input
              label="Your role / title (optional)"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          )}
          <div>
            <p className="text-sm font-medium text-navy">
              When do you usually plan your India recruitment trips?
            </p>
            <p className="mb-2 mt-0.5 text-xs text-navy/55">
              Pick your preferred months — we&rsquo;ll time fairs around you.
            </p>
            <div className="flex flex-wrap gap-2">
              {MONTHS.map((m) => (
                <Chip
                  key={m}
                  label={m.slice(0, 3)}
                  active={months.includes(m)}
                  onClick={() => toggle(months, setMonths, m)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Student-specific */}
      {role === "student" && (
        <div className="space-y-4 rounded-lg border border-navy/10 bg-cream/30 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Select
              label="Study level"
              value={studyLevel}
              onChange={(e) => setStudyLevel(e.target.value)}
            >
              <option value="">Select…</option>
              {STUDY_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="text-sm font-medium text-navy">
              Where do you dream of studying?
            </p>
            <p className="mb-2 mt-0.5 text-xs text-navy/55">
              Pick your target countries — we&rsquo;ll prioritise fairs with
              those universities.
            </p>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={countries.includes(c)}
                  onClick={() => toggle(countries, setCountries, c)}
                />
              ))}
            </div>
            {countries.includes("Other") && (
              <div className="mt-3">
                <Input
                  label="Which other countries?"
                  value={countriesOther}
                  onChange={(e) => setCountriesOther(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Field of interest (optional)"
              value={field}
              onChange={(e) => setField(e.target.value)}
            >
              <option value="">Select…</option>
              {FIELDS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
            <Select
              label="Intended intake (optional)"
              value={intake}
              onChange={(e) => setIntake(e.target.value)}
            >
              <option value="">Select…</option>
              {INTAKE_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {/* Consent */}
      <div className="space-y-2.5 rounded-lg border border-navy/10 bg-white p-4">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-navy/85">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-navy"
            checked={emailConsent}
            onChange={(e) => setEmailConsent(e.target.checked)}
          />
          Notify me by <strong className="font-semibold">email</strong> about
          future fairs.
        </label>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-navy/85">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-navy"
            checked={waConsent}
            onChange={(e) => setWaConsent(e.target.checked)}
          />
          Notify me on <strong className="font-semibold">WhatsApp</strong>{" "}
          (include your number above). Reply STOP anytime to opt out.
        </label>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <Button type="submit" variant="gold" size="lg" loading={busy} className="w-full">
        Keep me posted
      </Button>
      <p className="text-center text-xs text-navy/50">
        We&rsquo;ll only message you about IAES education fairs. No spam.
      </p>
    </form>
  );
}
