"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, History, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type {
  AnnouncementRecipient,
  AnnouncementSource,
} from "@/types";

const SOURCE_LABEL: Record<AnnouncementSource, string> = {
  PAST_PARTICIPANT: "Past Participant",
  MANUAL: "Manual",
  CSV_UPLOAD: "CSV Upload",
  NEWSLETTER: "Newsletter",
};

export function MailingListManager({
  initialRecipients,
}: {
  initialRecipients: AnnouncementRecipient[];
}) {
  const router = useRouter();
  const [recipients, setRecipients] =
    useState<AnnouncementRecipient[]>(initialRecipients);
  const [filter, setFilter] = useState<AnnouncementSource | "ALL">("ALL");

  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addOrg, setAddOrg] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [importBusy, setImportBusy] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  async function addOne(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddBusy(true);
    try {
      const res = await fetch("/api/admin/mailing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addEmail,
          name: addName,
          organization: addOrg,
          source: "MANUAL",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Add failed.");
      setAddEmail("");
      setAddName("");
      setAddOrg("");
      setAddOpen(false);
      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Add failed.");
    } finally {
      setAddBusy(false);
    }
  }

  async function importPast() {
    setImportBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/mailing-list/import-past", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Import failed.");
      setBanner(
        `${data.imported} contact${data.imported === 1 ? "" : "s"} imported.` +
          (data.skipped > 0 ? ` ${data.skipped} already existed.` : "")
      );
      router.refresh();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImportBusy(false);
    }
  }

  async function uploadCsv(file: File) {
    setCsvBusy(true);
    setCsvError(null);
    setBanner(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        throw new Error("No rows found. Header must be: email,name,organization");
      }
      const res = await fetch("/api/admin/mailing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: rows.map((r) => ({
            email: r.email,
            name: r.name,
            organization: r.organization,
            source: "CSV_UPLOAD",
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed.");
      setBanner(`${data.inserted} contact${data.inserted === 1 ? "" : "s"} added.`);
      router.refresh();
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setCsvBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this contact from the mailing list?")) return;
    try {
      const res = await fetch(`/api/admin/mailing-list/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Remove failed.");
      setRecipients((rs) => rs.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Remove failed.");
    }
  }

  const filtered =
    filter === "ALL"
      ? recipients
      : recipients.filter((r) => r.source === filter);
  const active = recipients.filter((r) => r.is_active);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-navy/70">
          <strong>{active.length}</strong> active contact
          {active.length === 1 ? "" : "s"} · {recipients.length} total
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={importPast}
            loading={importBusy}
          >
            <History className="h-4 w-4" /> Import past participants
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-navy/30 bg-transparent px-4 py-2 text-sm text-navy hover:bg-navy/5">
            <Upload className="h-4 w-4" />
            {csvBusy ? "Uploading…" : "Upload CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadCsv(file);
                e.target.value = "";
              }}
            />
          </label>
          <Button
            type="button"
            variant="gold"
            onClick={() => setAddOpen((v) => !v)}
          >
            <Plus className="h-4 w-4" /> Add contact
          </Button>
        </div>
      </div>

      {banner && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {banner}
        </div>
      )}
      {csvError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {csvError}
        </div>
      )}

      {addOpen && (
        <form
          onSubmit={addOne}
          className="rounded-md border border-navy/15 bg-cream/40 p-5"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              type="email"
              label="Email"
              required
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
            />
            <Input
              label="Name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
            />
            <Input
              label="Organization"
              value={addOrg}
              onChange={(e) => setAddOrg(e.target.value)}
            />
          </div>
          {addError && (
            <p className="mt-3 text-xs text-red-600">{addError}</p>
          )}
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddOpen(false)}
              disabled={addBusy}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gold" loading={addBusy}>
              Add to list
            </Button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2 text-xs">
        <span className="text-navy/55">Filter:</span>
        <FilterPill
          active={filter === "ALL"}
          onClick={() => setFilter("ALL")}
        >
          All
        </FilterPill>
        {(["PAST_PARTICIPANT", "MANUAL", "CSV_UPLOAD", "NEWSLETTER"] as const).map(
          (s) => (
            <FilterPill
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
            >
              {SOURCE_LABEL[s]}
            </FilterPill>
          )
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-cream/60 text-xs uppercase tracking-wider text-navy/55">
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Organization</Th>
              <Th>Source</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-navy/55"
                >
                  No contacts match this filter.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-t border-navy/5 align-top hover:bg-cream/40"
              >
                <td className="px-4 py-3 text-navy">{r.name || "—"}</td>
                <td className="px-4 py-3 text-navy/85">{r.email}</td>
                <td className="px-4 py-3 text-navy/65">
                  {r.organization || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-navy/65">
                  {SOURCE_LABEL[r.source]}
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.is_active ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-navy/[0.05] px-2.5 py-0.5 font-medium text-navy/55">
                      Unsubscribed
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => remove(r.id)}
                    aria-label="Remove"
                    className="text-navy/55 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-left">{children}</th>;
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-navy px-3 py-1 text-white"
          : "rounded-full border border-navy/15 px-3 py-1 text-navy/70 hover:bg-cream"
      }
    >
      {children}
    </button>
  );
}

interface ParsedRow {
  email: string;
  name: string;
  organization: string;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const headerRow = splitCsvLine(lines[0].toLowerCase());
  const idxEmail = headerRow.indexOf("email");
  const idxName = headerRow.indexOf("name");
  const idxOrg = headerRow.indexOf("organization");
  if (idxEmail === -1) return [];
  const out: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    const email = (cols[idxEmail] || "").trim();
    if (!email) continue;
    out.push({
      email,
      name: idxName >= 0 ? (cols[idxName] || "").trim() : "",
      organization: idxOrg >= 0 ? (cols[idxOrg] || "").trim() : "",
    });
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  // Minimal CSV parser handling quoted fields with commas.
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// Keep import for Lucide tree-shaking
void X;
