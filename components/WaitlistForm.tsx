"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

type State = "idle" | "submitting" | "success" | "duplicate" | "error";

export function WaitlistForm() {
  const [universityName, setUniversityName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("USA");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          university_name: universityName,
          contact_name: contactName,
          email,
          country,
        }),
      });
      const data = await res.json();

      if (data.alreadySignedUp) {
        setState("duplicate");
      } else if (res.ok) {
        setState("success");
      } else {
        setErrorMsg(data.error ?? "Something went wrong.");
        setState("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <span className="text-4xl">🎉</span>
        <h3 className="mt-3 font-serif text-xl font-semibold text-navy">
          You&rsquo;re on the list!
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          We&rsquo;ll email <span className="font-medium">{email}</span> the
          moment registration opens — with your early bird rate reserved.
        </p>
      </div>
    );
  }

  if (state === "duplicate") {
    return (
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-8 text-center">
        <span className="text-4xl">✅</span>
        <h3 className="mt-3 font-serif text-xl font-semibold text-navy">
          Already registered!
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium">{email}</span> is already on our
          mailing list. We&rsquo;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-navy/10 bg-white p-8 shadow-card"
    >
      <Input
        name="university_name"
        label="University Name"
        placeholder="Arizona State University"
        required
        value={universityName}
        onChange={(e) => setUniversityName(e.target.value)}
      />

      <Input
        name="contact_name"
        label="Your Name"
        placeholder="Director of International Admissions"
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
      />

      <Input
        name="email"
        type="email"
        label="Email Address"
        placeholder="admissions@university.edu"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Select
        name="country"
        label="Country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      >
        <option>USA</option>
        <option>Canada</option>
        <option>UK</option>
        <option>Australia</option>
        <option>Germany</option>
        <option>Other</option>
      </Select>

      {state === "error" && (
        <p className="text-xs text-red-600">{errorMsg}</p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={state === "submitting"}
        className="w-full"
      >
        {state === "submitting"
          ? "Signing up..."
          : "Notify Me When Registration Opens →"}
      </Button>

      <p className="text-center text-xs text-gray-400">
        No spam. One email when registration opens. Unsubscribe anytime.
      </p>
    </form>
  );
}
