# IAES Fairs — Claude Code Prompt v5 (ADDENDUM TO V2 + V3 + V4)
# Add AFTER v4 is complete.
# Do NOT rebuild anything from v1, v2, v3, or v4.
# This addendum adds: T&C page, checkbox in registration, T&C on PDF invoice.

---

## OVERVIEW OF V5 ADDITIONS

1. New page: `/terms` — full Terms & Conditions
2. New table column: `terms_accepted` on `registrations`
3. Registration form Step 2 — T&C checkbox (required)
4. PDF invoice — T&C summary block at the bottom
5. Admin dashboard — show T&C acceptance status per registration

---

## 1. DATABASE — Add to `registrations` Table

```sql
ALTER TABLE registrations
  ADD COLUMN terms_accepted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN terms_version TEXT DEFAULT '2026.1';
  -- Store which version they accepted — important for legal records
```

---

## 2. NEW PAGE: `/terms`

**Route:** `app/terms/page.tsx`
**Access:** Public — no login required.
**Purpose:** Canonical T&C page linked from registration form, invoice, and footer.

### Full T&C Content

Render the following as a clean, readable page with:
- IAES logo + header
- Navy sidebar navigation (jump to each clause)
- Serif font for headings (Playfair Display), DM Sans for body
- Print-friendly (add `print:` Tailwind classes)
- Last updated date: "Version 2026.1 — Effective 1 January 2026"

```typescript
// app/terms/page.tsx

export const metadata = {
  title: "Terms & Conditions — IAES Education Fair 2026",
  description:
    "Terms and Conditions for participation in the IAES U.S. University Education Outreach Tour and Fair.",
  robots: "index, follow",
};
```

**Page structure:**

```
<SiteHeader />

<main className="mx-auto max-w-4xl px-6 py-16">

  <h1>Terms and Conditions</h1>
  <p>IAES U.S. University Education Outreach Tour & Fair</p>
  <p>Version 2026.1 — Effective 1 January 2026</p>

  <p>
    These Terms constitute a binding legal agreement between
    Indo American Education Society ("IAES") ... and the
    Participating Institution ("University") ...
  </p>

  [All 15 clauses rendered as sections]
  [Each clause has an id="clause-N" for anchor links]

</main>

<SiteFooter />
```

### Clause Content

Paste all 15 clauses exactly as written in
`IAES_FAIR_TERMS_AND_CONDITIONS.md` (the document already prepared).

Key clauses to highlight visually (yellow/gold background box):

- **Clause 7 (Cancellation Policy)** — render the refund table with full styling
- **Clause 8 (No-Show)** — render in a red-tinted warning box
- **Clause 9 (Force Majeure)** — render in a gray info box

**Cancellation table styling:**
```tsx
<table className="w-full border-collapse text-sm">
  <thead className="bg-navy text-white">
    <tr>
      <th>Cancellation Received</th>
      <th>Refund</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>60+ days before Fair</td><td className="text-green-700 font-semibold">75% refund</td></tr>
    <tr><td>30–59 days before Fair</td><td className="text-yellow-700 font-semibold">50% refund</td></tr>
    <tr><td>15–29 days before Fair</td><td className="text-orange-700 font-semibold">25% refund</td></tr>
    <tr><td>Less than 15 days</td><td className="text-red-700 font-semibold">No refund</td></tr>
    <tr><td>No-show</td><td className="text-red-700 font-semibold">No refund</td></tr>
  </tbody>
</table>
```

---

## 3. REGISTRATION FORM — Add T&C Checkbox

**Where:** End of Step 2 (Contact Person step), just before the "Next →" button.

### Checkbox Component

```tsx
// In Step2Contact.tsx — add at the bottom before submit button

<div className="mt-8 rounded-xl border border-navy/10 bg-[#F5F7FA] p-5">
  <p className="text-xs font-semibold uppercase tracking-wide text-navy">
    Terms & Conditions
  </p>

  {/* Scrollable T&C summary box */}
  <div className="mt-3 h-40 overflow-y-auto rounded-lg border border-navy/10 bg-white p-4 text-xs text-gray-600 leading-relaxed">
    <p className="font-semibold text-navy">Key Points:</p>
    <ul className="mt-2 space-y-1.5 list-disc list-inside">
      <li>Maximum 2 representatives per counter space.</li>
      <li>Second table charged at USD 2,000 extra.</li>
      <li>Transportation provided for official visits only — not personal travel.</li>
      <li>No refund for no-shows or cancellations less than 15 days before the Fair.</li>
      <li>Cancellations 15–29 days prior: 25% refund. 30–59 days: 50%. 60+ days: 75%.</li>
      <li>GST amounts are non-refundable once invoiced.</li>
      <li>IAES liability limited to registration fee paid.</li>
      <li>Force Majeure: IAES not liable for unscheduled closures or cancellations.</li>
      <li>Student data obtained via QR scan is for admissions use only.</li>
      <li>Disputes governed by Ahmedabad courts under Indian law.</li>
    </ul>
    <p className="mt-3 text-gray-400">
      Full terms available at{" "}
      <a
        href="/terms"
        target="_blank"
        className="text-navy underline"
      >
        fairs.iaesgujarat.org/terms
      </a>
    </p>
  </div>

  {/* Checkbox */}
  <label className="mt-4 flex items-start gap-3 cursor-pointer">
    <input
      type="checkbox"
      {...register("terms_accepted", {
        required: "You must accept the Terms & Conditions to proceed.",
      })}
      className="mt-0.5 h-4 w-4 rounded border-navy/30 text-navy
                 focus:ring-navy accent-navy"
    />
    <span className="text-sm text-gray-700 leading-snug">
      I confirm that I have read, understood, and agree to the{" "}
      <a
        href="/terms"
        target="_blank"
        className="font-semibold text-navy underline underline-offset-2"
      >
        Terms & Conditions
      </a>{" "}
      of the IAES U.S. University Education Outreach Tour & Fair 2026.
      I confirm I am authorised to enter this agreement on behalf of my institution.
    </span>
  </label>

  {/* Error message */}
  {errors.terms_accepted && (
    <p className="mt-2 text-xs text-red-600">
      {errors.terms_accepted.message}
    </p>
  )}
</div>
```

### Validation Rule

The "Next →" / "Submit" button must be **disabled** until `terms_accepted = true`.
Use `react-hook-form` validation — `required: true` on the checkbox field.

---

## 4. UPDATE: `/api/register` — Store T&C Acceptance

```typescript
// In app/api/register/route.ts
// Add to the registrations INSERT:

await supabase.from("registrations").insert({
  // ... all existing fields ...
  terms_accepted: true,           // validated on frontend — always true here
  terms_accepted_at: new Date().toISOString(),
  terms_version: "2026.1",
});
```

**Never allow a registration to be created with `terms_accepted = false`.**
Add a server-side guard:

```typescript
if (!body.terms_accepted) {
  return NextResponse.json(
    { error: "Terms and Conditions must be accepted." },
    { status: 400 }
  );
}
```

---

## 5. UPDATE: PDF INVOICE — T&C Summary Block

Add a T&C summary section at the bottom of both invoice variants
(`InvoiceUSD.tsx` and `InvoiceINR.tsx`).

### For @react-pdf/renderer

```tsx
// Add at the bottom of the invoice PDF, after the payment total block

import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  tcSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderTopStyle: "solid",
  },
  tcHeading: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#0B2B5C",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  tcText: {
    fontSize: 7,
    color: "#6B7280",
    lineHeight: 1.5,
    marginBottom: 3,
  },
  tcHighlight: {
    fontSize: 7,
    color: "#DC2626",   // red — for no-refund clauses
    marginBottom: 3,
  },
  tcUrl: {
    fontSize: 7,
    color: "#0B2B5C",
    textDecoration: "underline",
  },
  tcAcceptedBox: {
    marginTop: 10,
    backgroundColor: "#F0FDF4",  // light green
    padding: 8,
    borderRadius: 4,
  },
  tcAcceptedText: {
    fontSize: 7,
    color: "#166534",            // dark green
  },
});

// Render in PDF:
<View style={styles.tcSection}>
  <Text style={styles.tcHeading}>Terms & Conditions — Summary</Text>

  <Text style={styles.tcText}>
    1. Maximum 2 representatives permitted per counter space.
       Second table: USD 2,000 additional charge.
  </Text>
  <Text style={styles.tcText}>
    2. Transportation provided for official Event visits only.
       Personal travel is at the University's own cost.
  </Text>
  <Text style={styles.tcText}>
    3. IAES provides counter space, chairs, water, and meals
       during institutional visits and fairs.
  </Text>
  <Text style={styles.tcHighlight}>
    4. No-Show: No refund. Cancellation less than 15 days prior: No refund.
  </Text>
  <Text style={styles.tcText}>
    5. Cancellation 15–29 days prior: 25% refund.
       30–59 days: 50% refund. 60+ days: 75% refund.
       GST amounts are non-refundable in all cases.
  </Text>
  <Text style={styles.tcText}>
    6. IAES is not liable for Force Majeure events including
       unscheduled venue closures or cancellations.
  </Text>
  <Text style={styles.tcText}>
    7. Student data obtained at the Event is for admissions
       use only and must not be shared with third parties.
  </Text>
  <Text style={styles.tcText}>
    Full Terms & Conditions:{" "}
    <Text style={styles.tcUrl}>
      https://fairs.iaesgujarat.org/terms
    </Text>
  </Text>

  {/* Acceptance confirmation block */}
  <View style={styles.tcAcceptedBox}>
    <Text style={styles.tcAcceptedText}>
      ✓ Terms & Conditions accepted by {repName} on behalf of {universityName}.
    </Text>
    <Text style={styles.tcAcceptedText}>
      Accepted on: {termsAcceptedAt} | Version: 2026.1
    </Text>
  </View>
</View>
```

---

## 6. NEW PAGE: `/terms` FOOTER LINK

Add "Terms & Conditions" to `SiteFooter.tsx`:

```tsx
// In SiteFooter.tsx — add to footer links

<Link
  href="/terms"
  className="text-xs text-white/60 hover:text-white transition-colors"
>
  Terms & Conditions
</Link>
```

---

## 7. UPDATE: Admin Dashboard — T&C Column

In the University Registrations table, add a column:

| ... | T&C Accepted | Accepted At | Version | ... |
|---|---|---|---|---|
| ... | ✅ Yes | 14 May 2026 10:32am | 2026.1 | ... |

If for any legacy/test record `terms_accepted = false`:
Show a ⚠️ warning badge — "T&C not recorded".

---

## 8. TYPES — Update `types/index.ts`

```typescript
// Add to Registration interface:
export interface Registration {
  // ... existing fields ...
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  terms_version: string | null;
}
```

---

## BUILD ORDER FOR V5 (run after v4 is complete)

1. Run SQL: `ALTER TABLE registrations` — add T&C columns
2. Create `app/terms/page.tsx` — full T&C page (all 15 clauses)
3. Add T&C link to `SiteFooter.tsx`
4. Update `components/RegistrationForm/Step2Contact.tsx` — add checkbox + scrollable summary
5. Update `app/api/register/route.ts` — store `terms_accepted`, `terms_accepted_at`, `terms_version`
6. Update `components/InvoiceView/InvoiceUSD.tsx` — add T&C block at bottom of PDF
7. Update `components/InvoiceView/InvoiceINR.tsx` — same T&C block
8. Update `app/admin/dashboard/page.tsx` — add T&C columns to table
9. Update `types/index.ts` — add T&C fields to Registration type

---

## CRITICAL RULES FOR V5

- `terms_accepted` must be validated BOTH on frontend (checkbox required)
  AND backend (server-side guard in API route)
- Store `terms_accepted_at` timestamp — this is the legal moment of acceptance
- Store `terms_version` — if T&C are updated in future, old records show
  which version was accepted (essential for dispute resolution)
- The checkbox must link to `/terms` opening in a new tab
- The scrollable summary in the registration form is a SUMMARY only —
  the full legal text lives at `/terms`
- PDF invoice shows: rep name + acceptance timestamp + version
- Never allow invoice to be generated if `terms_accepted = false`
- Do NOT rebuild anything from v1, v2, v3, or v4

---

## T&C CONTENT SOURCE

The full 15-clause Terms & Conditions text for the `/terms` page
is in the document: `IAES_FAIR_TERMS_AND_CONDITIONS.md`

Paste all 15 clauses verbatim into `app/terms/page.tsx`.
Do not summarise or shorten on the `/terms` page — full text required.
The scrollable box in the registration form uses the 10-point summary only.
