# IAES Fairs

**`fairs.iaesgujarat.org`** — Official registration platform for the
[Indo American Education Society](https://iaesgujarat.org) EducationUSA Fairs.

Universities register → receive a GST invoice → pay via Razorpay → get a
confirmation booking. Admins manage all registrations from a private
dashboard.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database & Auth**: Supabase
- **Payments**: Razorpay
- **Emails**: Resend (React Email templates)
- **PDF**: `@react-pdf/renderer`
- **Forms**: react-hook-form + zod
- **Styling**: Tailwind CSS
- **Hosting**: Netlify

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in real credentials
cp .env.example .env.local
# Then edit .env.local

# 3. Apply the Supabase schema (one-time)
#    Open Supabase > SQL Editor > paste supabase/migrations/0001_initial_schema.sql > Run

# 4. Start the dev server
npm run dev
```

Then open <http://localhost:3000>.

---

## Environment Variables

See [`.env.example`](./.env.example) for the full list. All keys must be set
before the app will function in production.

| Variable | Source |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API (server only) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Dashboard > Settings > API Keys |
| `RAZORPAY_KEY_SECRET` | Razorpay Dashboard > Settings > API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard > Settings > Webhooks |
| `RESEND_API_KEY` | <https://resend.com/api-keys> |
| `RESEND_FROM_EMAIL` | A verified Resend sender |
| `NEXT_PUBLIC_APP_URL` | Public URL of the deployment |

---

## Supabase Setup

1. Create a Supabase project (already done — `wpmhbfegrjenqbjvavxf`).
2. Open **SQL Editor** and run the contents of
   [`supabase/migrations/0001_initial_schema.sql`](./supabase/migrations/0001_initial_schema.sql).
   This creates all tables, the invoice-number sequence, RLS policies, and seeds
   one active fair plus an admin user.
3. Confirm tables exist: **Table Editor** should show `fairs`, `registrations`,
   `invoices`, `payments`, and `admin_users`.
4. To grant admin access to additional users:
   ```sql
   INSERT INTO admin_users (email, name) VALUES ('new.admin@iaesgujarat.org', 'Name');
   ```

### Generating Database Types (optional)

To regenerate strict TypeScript types from the live schema:

```bash
# Sign in to the IAES Supabase account first
npx supabase login

# Then generate types
npm run db:types
```

This writes `types/database.types.ts`. Import it into your queries via
`createClient<Database>()` for end-to-end type safety.

---

## Razorpay Setup

1. Create a Razorpay account and generate **test-mode** API keys.
2. Add the keys to `.env.local` (`NEXT_PUBLIC_RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`).
3. Set up a webhook:
   - **URL**: `https://<your-domain>/api/razorpay/webhook`
   - **Events**: `payment.captured`, `payment.authorized`, `payment.failed`
   - Copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`.

For local testing, use a tunnel (e.g. `ngrok http 3000`) to receive webhooks.

---

## Resend Setup

1. Verify a sending domain (e.g. `iaesgujarat.org`) in Resend.
2. Create an API key and add it to `RESEND_API_KEY`.
3. Set `RESEND_FROM_EMAIL` to a verified sender on that domain.

Emails are sent for two events:
- **Invoice issued** — after a successful registration submission.
- **Booking confirmed** — after a successful Razorpay payment.

---

## Deployment (Netlify)

Netlify is already connected to the GitHub repo. Each push to `main` triggers
a new deploy.

1. Add **all** env vars from `.env.example` to **Site settings > Environment variables**
   (mark `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
   and `RESEND_API_KEY` as **secrets**).
2. Update `NEXT_PUBLIC_APP_URL` to the production URL (`https://fairs.iaesgujarat.org`).
3. Add the custom domain in **Domain settings**, then point DNS at Netlify.
4. The `netlify.toml` at the repo root already handles the Next.js build via
   `@netlify/plugin-nextjs`.

---

## Project Structure

```
app/                          # Next.js App Router
  page.tsx                    # Public landing (fair details + CTA)
  register/page.tsx           # Two-step registration form
  invoice/[id]/page.tsx       # Invoice view + PDF download
  payment/[id]/page.tsx       # Razorpay checkout entry
  confirmation/[id]/page.tsx  # Post-payment success page
  admin/login/page.tsx        # Magic-link admin sign-in
  admin/dashboard/page.tsx    # Registrations table + stats + CSV
  auth/callback/route.ts      # Supabase OAuth callback
  api/
    register/route.ts                # Create registration + invoice + email
    razorpay/create-order/route.ts   # Create Razorpay order
    razorpay/verify/route.ts         # Verify checkout signature
    razorpay/webhook/route.ts        # Razorpay payment webhook
    admin/registrations/route.ts     # Admin list + CSV export
    admin/registrations/[id]/...     # Admin status update + reminder

components/                   # React components (landing, form, table, PDF, UI)
emails/                       # Resend email templates (React)
lib/                          # Supabase clients, Razorpay, Resend, invoice helpers
supabase/migrations/          # SQL migrations (apply via Supabase SQL Editor)
types/                        # TypeScript types
middleware.ts                 # Auth-gates the /admin area
```

---

## Status Lifecycle

```
pending  →  invoice_sent  →  paid       →  confirmed
                                          ↘
                                            cancelled
```

- `pending` — registration submitted, invoice being generated.
- `invoice_sent` — invoice email sent to the contact.
- `paid` — Razorpay payment captured (set by webhook).
- `confirmed` — fully confirmed (set by webhook + verify route).
- `cancelled` — manually cancelled by admin.

---

## Support

Email <eduadviser@iaesgujarat.org> · Call +91 98255 93262
