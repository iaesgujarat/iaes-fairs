"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "iaes.scan.university";

interface ScannerIdentity {
  registrationId: string;
  universityName: string;
  invoiceNumber: string;
}

interface SharingProfile {
  sharing: true;
  pass_uuid: string;
  pass_number: string;
  full_name: string;
  institution_name: string;
  current_course: string | null;
  current_semester: string | null;
  english_exam: string | null;
  field_of_interest: string[];
  budget_range: string | null;
  preferred_countries: string[];
  phone: string | null;
  email: string | null;
}

interface NotSharingProfile {
  sharing: false;
  pass_uuid: string;
  pass_number: string;
  full_name: string;
  institution_name: string;
}

type Profile = SharingProfile | NotSharingProfile;

export default function ScanProfilePage({
  params,
}: {
  params: { passUuid: string };
}) {
  const [identity, setIdentity] = useState<ScannerIdentity | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [repNotes, setRepNotes] = useState("");
  const [interested, setInterested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<
    null | { alreadyScanned: boolean; scannedAt: string }
  >(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setIdentity(JSON.parse(raw) as ScannerIdentity);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/scan/${params.passUuid}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Could not load profile.");
        if (!cancelled) setProfile(body as Profile);
      } catch (e) {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : "Could not load profile."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.passUuid]);

  async function save() {
    if (!identity || !profile) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/scan/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passUuid: profile.pass_uuid,
          universityRegistrationId: identity.registrationId,
          repNotes: repNotes || undefined,
          interested,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Save failed.");
      setSaveState({
        alreadyScanned: !!body.alreadyScanned,
        scannedAt: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!identity) {
    return (
      <main className="min-h-screen bg-navy text-white">
        <div className="mx-auto max-w-md px-6 py-10 text-center">
          <p>You need to connect a booth first.</p>
          <Link
            href="/scan"
            className="mt-4 inline-block rounded-md bg-gold px-6 py-2.5 text-sm font-semibold text-navy"
          >
            Go to scanner
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream/30">
      <div className="mx-auto max-w-md px-6 py-6">
        <div className="flex items-center justify-between">
          <Link
            href="/scan"
            className="inline-flex items-center gap-1.5 text-sm text-navy/70 hover:text-navy"
          >
            <ArrowLeft className="h-4 w-4" /> Scan another
          </Link>
          <span className="text-xs text-navy/55">
            {identity.universityName}
          </span>
        </div>

        {loading && (
          <p className="mt-12 text-center text-sm text-navy/55">
            Loading profile…
          </p>
        )}

        {loadError && (
          <div className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {profile && profile.sharing === false && (
          <div className="mt-8 rounded-2xl border border-navy/10 bg-white p-6 text-center shadow-card">
            <p className="font-serif text-xl font-semibold text-navy">
              {profile.full_name}
            </p>
            <p className="mt-1 text-sm text-navy/70">
              {profile.institution_name}
            </p>
            <p className="mt-6 text-sm text-navy/55">
              This student has not consented to sharing contact details.
            </p>
            <p className="mt-2 text-xs text-navy/40">
              Pass: {profile.pass_number}
            </p>
          </div>
        )}

        {profile && profile.sharing && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
            <p className="font-serif text-2xl font-semibold text-navy">
              {profile.full_name}
            </p>
            <p className="mt-1 text-sm text-navy/70">
              {profile.institution_name}
            </p>
            {(profile.current_course || profile.current_semester) && (
              <p className="mt-0.5 text-xs text-navy/55">
                {[profile.current_course, profile.current_semester]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

            <div className="mt-5 space-y-1 text-sm text-navy">
              {profile.phone && (
                <p>
                  <span className="text-navy/55">📱 </span>
                  {profile.phone}
                </p>
              )}
              {profile.email && (
                <p>
                  <span className="text-navy/55">✉ </span>
                  {profile.email}
                </p>
              )}
              {!profile.phone && !profile.email && (
                <p className="text-xs italic text-navy/50">
                  Student opted out of sharing direct contact info.
                </p>
              )}
            </div>

            {profile.field_of_interest.length > 0 && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wider text-navy/55">
                  Interested in
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {profile.field_of_interest.map((f) => (
                    <li
                      key={f}
                      className="rounded-full bg-gold/10 px-2.5 py-0.5 text-xs text-navy"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              {profile.budget_range && (
                <Detail label="Budget" value={profile.budget_range} />
              )}
              {profile.preferred_countries.length > 0 && (
                <Detail
                  label="Countries"
                  value={profile.preferred_countries.join(", ")}
                />
              )}
              {profile.english_exam && (
                <Detail label="English" value={profile.english_exam} />
              )}
              <Detail label="Pass" value={profile.pass_number} />
            </dl>

            <div className="mt-6">
              <label className="text-xs uppercase tracking-wider text-navy/55">
                Quick note (optional)
              </label>
              <textarea
                value={repNotes}
                onChange={(e) => setRepNotes(e.target.value)}
                rows={2}
                placeholder="Strong fit for engineering. Follow up about scholarship deadline."
                className="mt-1 block w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-sm text-navy placeholder:text-navy/40 focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/30"
                disabled={!!saveState}
              />

              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-navy">
                <input
                  type="checkbox"
                  checked={interested}
                  onChange={(e) => setInterested(e.target.checked)}
                  className="accent-navy"
                  disabled={!!saveState}
                />
                Mark as interested
              </label>
            </div>

            {saveError && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {saveError}
              </div>
            )}

            {saveState ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                {saveState.alreadyScanned
                  ? "✓ Already in your list — notes updated."
                  : `✓ Saved · ${saveState.scannedAt}`}
              </div>
            ) : (
              <Button
                onClick={save}
                variant="gold"
                size="lg"
                loading={saving}
                className="mt-5 w-full"
              >
                <Star className="h-4 w-4" /> Save Contact
              </Button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-navy/55">
        {label}
      </dt>
      <dd className="mt-0.5 text-navy">{value}</dd>
    </div>
  );
}
