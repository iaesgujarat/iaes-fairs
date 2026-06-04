"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

export interface ControlsProps {
  registrationId: string;
  /** Paid/confirmed — billing + delete are locked. */
  isLocked: boolean;
  status: string;
  details: {
    university_name: string;
    university_country: string;
    university_website: string;
    contact_name: string;
    contact_title: string;
    contact_email: string;
    contact_phone: string;
  };
  currentMode: "university" | "india_office";
  attn: { name: string; title: string; email: string; cc: boolean } | null;
  billing: {
    legal_name: string;
    billing_address: string;
    city: string;
    state: string;
    pin_code: string;
    pan_number: string;
    is_gst_registered: boolean;
    gstin: string;
    authorization_note: string;
  } | null;
}

function Card({
  title,
  hint,
  danger,
  children,
}: {
  title: string;
  hint?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border p-5 shadow-card ${
        danger ? "border-red-200 bg-red-50/40" : "border-navy/10 bg-white"
      }`}
    >
      <p
        className={`text-xs uppercase tracking-wider ${
          danger ? "text-red-600" : "text-navy/55"
        }`}
      >
        {title}
      </p>
      {hint && <p className="mb-3 mt-1 text-xs text-navy/50">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

export function RegistrationAdminControls(props: ControlsProps) {
  return (
    <div className="space-y-6">
      <DetailsEditor {...props} />
      <BillingRecipientEditor {...props} />
      <DangerZone {...props} />
    </div>
  );
}

// ---------------------------------------------------------------
// 1. Edit identity / contact
// ---------------------------------------------------------------
function DetailsEditor({ registrationId, details }: ControlsProps) {
  const router = useRouter();
  const [form, setForm] = useState(details);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed.");
      setMsg("Saved.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Edit details" hint="Fix or update what a rep gave us by phone / email. Does not change pricing.">
      <div className="space-y-4">
        <Input
          label="University Name"
          value={form.university_name}
          onChange={(e) => set("university_name")(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Country"
            value={form.university_country}
            onChange={(e) => set("university_country")(e.target.value)}
          />
          <Input
            label="Website"
            value={form.university_website}
            onChange={(e) => set("university_website")(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Contact Name"
            value={form.contact_name}
            onChange={(e) => set("contact_name")(e.target.value)}
          />
          <Input
            label="Title"
            value={form.contact_title}
            onChange={(e) => set("contact_title")(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            type="email"
            label="Contact Email"
            value={form.contact_email}
            onChange={(e) => set("contact_email")(e.target.value)}
          />
          <Input
            label="Phone"
            value={form.contact_phone}
            onChange={(e) => set("contact_phone")(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="gold" loading={busy} onClick={save}>
            Save details
          </Button>
          {msg && <span className="text-xs text-emerald-700">{msg}</span>}
          {err && <span className="text-xs text-red-600">{err}</span>}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------
// 2. Billing & invoice recipient (Mode A / Mode B)
// ---------------------------------------------------------------
function BillingRecipientEditor({
  registrationId,
  isLocked,
  currentMode,
  attn,
  billing,
}: ControlsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"university" | "india_office">(currentMode);

  // Mode A (university) — Attn override
  const [billToOther, setBillToOther] = useState(!!attn);
  const [attnName, setAttnName] = useState(attn?.name ?? "");
  const [attnTitle, setAttnTitle] = useState(attn?.title ?? "");
  const [attnEmail, setAttnEmail] = useState(attn?.email ?? "");
  const [attnCc, setAttnCc] = useState(attn?.cc ?? true);

  // Mode B (India office) — billing details
  const [b, setB] = useState({
    legal_name: billing?.legal_name ?? "",
    billing_address: billing?.billing_address ?? "",
    city: billing?.city ?? "",
    state: billing?.state ?? "",
    pin_code: billing?.pin_code ?? "",
    pan_number: billing?.pan_number ?? "",
    is_gst_registered: billing?.is_gst_registered ?? false,
    gstin: billing?.gstin ?? "",
    authorization_note: billing?.authorization_note ?? "",
  });
  const setBilling = (k: keyof typeof b) => (v: string | boolean) =>
    setB((p) => ({ ...p, [k]: v }));

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (isLocked) {
    return (
      <Card title="Billing & invoice recipient">
        <p className="text-sm text-navy/60">
          This registration is paid — its tax invoice is locked and the billed
          party can no longer be changed.
        </p>
      </Card>
    );
  }

  async function save(resend: boolean) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const payload =
        mode === "india_office"
          ? { mode, ...b }
          : {
              mode,
              bill_to_self: !billToOther,
              bill_to_attn_name: attnName,
              bill_to_attn_title: attnTitle,
              bill_to_attn_email: attnEmail,
              bill_to_cc: attnCc,
            };
      const res = await fetch(
        `/api/admin/registrations/${registrationId}/billing`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.details
            ? `${data.error} ${Object.values(data.details).flat().join(" ")}`
            : data?.error || "Save failed."
        );
      }
      if (resend) {
        const r2 = await fetch(
          `/api/admin/registrations/${registrationId}/resend-proforma`,
          { method: "POST" }
        );
        const d2 = await r2.json();
        if (!r2.ok) throw new Error(d2?.error || "Saved, but email failed.");
        setMsg(d2.cc ? `Saved & emailed (CC ${d2.cc}).` : "Saved & emailed.");
      } else {
        setMsg("Saved.");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Billing & invoice recipient"
      hint="Who the proforma/invoice is billed to. Change any time before payment."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <ModeButton
          active={mode === "university"}
          onClick={() => setMode("university")}
          label="University pays directly (USD)"
        />
        <ModeButton
          active={mode === "india_office"}
          onClick={() => setMode("india_office")}
          label="India office handles payment (INR · GST)"
        />
      </div>

      {mode === "university" ? (
        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-navy"
              checked={billToOther}
              onChange={(e) => setBillToOther(e.target.checked)}
            />
            <span className="text-sm leading-snug text-navy/85">
              Address the invoice to someone else (Attn:)
              <span className="block text-xs text-navy/55">
                Legal entity stays the university; adds an &ldquo;Attn:&rdquo;
                line + optional CC.
              </span>
            </span>
          </label>
          {billToOther && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Recipient Name"
                  value={attnName}
                  onChange={(e) => setAttnName(e.target.value)}
                />
                <Input
                  label="Title / Department"
                  value={attnTitle}
                  onChange={(e) => setAttnTitle(e.target.value)}
                />
              </div>
              <Input
                type="email"
                label="Recipient Email"
                value={attnEmail}
                onChange={(e) => setAttnEmail(e.target.value)}
              />
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-navy/85">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-navy"
                  checked={attnCc}
                  onChange={(e) => setAttnCc(e.target.checked)}
                />
                Email a copy to this recipient.
              </label>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Legal Entity Name"
            placeholder="e.g. Sannam S4 India Private Limited"
            value={b.legal_name}
            onChange={(e) => setBilling("legal_name")(e.target.value)}
          />
          <Textarea
            label="Billing Address"
            value={b.billing_address}
            onChange={(e) => setBilling("billing_address")(e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="City"
              value={b.city}
              onChange={(e) => setBilling("city")(e.target.value)}
            />
            <Select
              label="State"
              value={b.state}
              onChange={(e) => setBilling("state")(e.target.value)}
            >
              <option value="">Select state…</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Input
              label="PIN Code"
              value={b.pin_code}
              onChange={(e) => setBilling("pin_code")(e.target.value)}
            />
          </div>
          <Input
            label="PAN Number"
            value={b.pan_number}
            onChange={(e) => setBilling("pan_number")(e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-navy/85">
            <input
              type="checkbox"
              className="h-4 w-4 accent-navy"
              checked={b.is_gst_registered}
              onChange={(e) => setBilling("is_gst_registered")(e.target.checked)}
            />
            GST registered in India
          </label>
          {b.is_gst_registered && (
            <Input
              label="GSTIN"
              placeholder="07ABCDE1234F1Z5"
              value={b.gstin}
              onChange={(e) => setBilling("gstin")(e.target.value)}
            />
          )}
          <Textarea
            label="Authorization note"
            placeholder="e.g. University of Arizona's email of 3 Jun 2026 instructing us to bill their India office."
            value={b.authorization_note}
            onChange={(e) => setBilling("authorization_note")(e.target.value)}
          />
          <p className="text-xs text-navy/50">
            Switching here re-bills this registration in INR with GST. The
            university stays recorded as the service recipient.
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button size="sm" variant="gold" loading={busy} onClick={() => save(false)}>
          Save
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={busy}
          onClick={() => save(true)}
        >
          Save &amp; resend email
        </Button>
        {msg && <span className="text-xs text-emerald-700">{msg}</span>}
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </Card>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-navy bg-navy text-white"
          : "border-navy/15 bg-white text-navy/70 hover:border-navy/40"
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------
// 3. Danger zone — cancel (soft) / delete (hard)
// ---------------------------------------------------------------
function DangerZone({ registrationId, status }: ControlsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"cancel" | "delete" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");

  const isCancelled = status === "cancelled";
  const isPaid = status === "paid" || status === "confirmed";

  async function cancel() {
    setBusy("cancel");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Cancel failed.");
      setMsg("Registration cancelled. The email can now re-register.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cancel failed.");
    } finally {
      setBusy(null);
    }
  }

  async function hardDelete() {
    setBusy("delete");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed.");
      router.push("/admin/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed.");
      setBusy(null);
    }
  }

  return (
    <Card title="Danger zone" danger>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            loading={busy === "cancel"}
            disabled={isCancelled || isPaid}
            onClick={cancel}
          >
            {isCancelled ? "Already cancelled" : "Cancel registration"}
          </Button>
          <span className="text-xs text-navy/55">
            Soft, reversible. Voids unpaid invoices and frees the email to
            re-register. Use this for &ldquo;registered but didn&rsquo;t pay in
            time.&rdquo;
          </span>
        </div>

        {!isPaid && (
          <div className="rounded-md border border-red-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
              Delete permanently
            </p>
            <p className="mt-1 text-xs text-navy/60">
              Removes the registration and all its invoices, billing, payments,
              scans and event opt-ins. Cannot be undone. For junk / test /
              duplicate rows only. Type{" "}
              <span className="font-mono font-semibold">DELETE</span> to enable.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder="DELETE"
                className="w-32 rounded-md border border-navy/15 px-3 py-1.5 text-sm"
              />
              <Button
                size="sm"
                variant="secondary"
                loading={busy === "delete"}
                disabled={confirmDelete !== "DELETE"}
                onClick={hardDelete}
              >
                Delete permanently
              </Button>
            </div>
          </div>
        )}

        {msg && <p className="text-xs text-emerald-700">{msg}</p>}
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
    </Card>
  );
}
