# Platform billing (Stage 3)

Stripe-managed subscriptions for customer hubs. Stripe is the **source of truth**; platform D1 mirrors subscription state via webhooks.

Related: [roadmap](./roadmap.md) §3 · [platform provision](./platform-provision.md)

## Architecture

| Component | Location |
|-----------|----------|
| Checkout + billing API | Platform Pages Functions — `/api/platform/billing/*` |
| Stripe webhooks | `/api/stripe/webhook` (no Cloudflare Access) |
| Billing mirror | D1 `lovely-home-platform-billing` → binding `PLATFORM_BILLING_DB` |
| Provision / deprovision | `trialing` webhook → **Platform site provision**; `subscription.deleted` / canceled → **Platform site billing deprovision** |

## One-time setup (test mode)

1. **Stripe Dashboard (test mode)** — create Product + recurring Price (GBP). Note `price_…`.
2. **Terraform** — optional vars on `module.platform_admin` (via `terraform/environments/hub.tfvars`):
   - `stripe_secret_key` = `sk_test_…`
   - `stripe_webhook_secret` = `whsec_…` (from Stripe CLI or Dashboard endpoint)
   - `stripe_price_id` = monthly `price_…` (e.g. £9.99/month)
   - `stripe_price_id_yearly` = yearly `price_…` (e.g. £99/year)

   **Important:** Platform Pages env is managed by Terraform. Setting Stripe vars **only in the Cloudflare dashboard** is not enough — the next `terraform apply` (including **Platform site provision** on any hub) rewrites env vars and **removes** dashboard-only secrets. Always keep Stripe values in `hub.tfvars` (local apply) and in GitHub Actions secrets (CI provision).

   For CI, add repo secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_ID` (same values as Terraform). Verify after apply:

   ```bash
   bash scripts/verify-platform-stripe-env.sh
   ```
3. **`terraform apply`** — creates D1 database and binds `PLATFORM_BILLING_DB` on `home-dashboard-platform`.
4. **Apply migration:**
   ```bash
   node scripts/apply-platform-billing-migration.mjs
   ```
5. **Webhook endpoint** (production platform hostname):
   ```
   https://platform.lovely-home.co.uk/api/stripe/webhook
   ```
   Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`, `customer.subscription.trial_will_end`.

   **Cloudflare Access:** Stripe cannot log in via OTP. Add a **Bypass** Access application for `platform.lovely-home.co.uk/api/stripe/webhook` (Terraform: `platform_stripe_webhook` in `terraform/modules/platform_admin/access.tf`), or manually in Zero Trust → Access → Add application → path `/api/stripe/webhook` → Bypass → Everyone. Without this, deliveries fail (302/500) and billing rows are never written.

   If you created the Access app manually first, import it before `terraform apply`:
   ```bash
   export CLOUDFLARE_API_TOKEN="..."
   bash scripts/import-platform-stripe-webhook-access.sh -var-file=environments/hub.tfvars
   cd terraform && terraform apply -var-file=environments/hub.tfvars
   ```

## Local development

Forward Stripe webhooks to the platform dev stack:

```bash
# Terminal 1
npm run dev:platform

# Terminal 2 — after `stripe login`
stripe listen --forward-to http://127.0.0.1:8791/stripe/webhook
```

Set secrets in `.dev.vars` on the platform Pages project or export for local testing:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (from `stripe listen`)
- `STRIPE_PRICE_ID` — monthly subscription price
- `STRIPE_PRICE_ID_YEARLY` — yearly subscription price (optional but recommended for public signup)

Local dev API (`scripts/platform-admin-dev-api.mjs`) does not yet mirror billing routes — use deployed preview or `wrangler pages dev` for full billing tests.

## Operator API (Access-protected)

### Create Checkout session (7-day trial, card at signup)

Trial length is `TRIAL_PERIOD_DAYS` in `functions/api/platform/platformBilling.js` (currently **7**), sent as Stripe `subscription_data.trial_period_days`. It is not set on the Price in the Stripe Dashboard.

```http
POST /api/platform/billing/checkout
Content-Type: application/json

{
  "siteId": "smith",
  "customerEmail": "owner@example.com"
}
```

Response: `{ "ok": true, "sessionId": "cs_…", "url": "https://checkout.stripe.com/…" }`

### List billing records

```http
GET /api/platform/billing
```

### Site billing status

```http
GET /api/platform/billing/sites/smith
```

## Test cards

Use [Stripe test cards](https://docs.stripe.com/testing#cards) — e.g. `4242 4242 4242 4242`, any future expiry, any CVC.

Advance trial billing without waiting 7 days: [Stripe test clocks](https://docs.stripe.com/billing/testing/test-clocks).

## Slice 2 — provision on trialing (shipped)

When Stripe sends `checkout.session.completed` or `customer.subscription.created` with status **trialing**:

1. Platform D1 billing row is upserted (as before).
2. If the site is in `platform-manifest.json` but has **no Terraform contract** yet, the platform dispatches [`platform-site-provision.yml`](../.github/workflows/platform-site-provision.yml) via `PLATFORM_GITHUB_TOKEN`.
3. `site_billing.provision_dispatched_at` is set on success so duplicate webhooks do not re-run provision.
4. If GitHub dispatch fails, the webhook returns **503** (Stripe retries) and `provision_last_error` is recorded.

Skipped automatically for `production`, `demo`, sites that already have a D1 contract in the manifest, or when provision was already dispatched.

Apply migration after deploy:

```bash
node scripts/apply-platform-billing-migration.mjs
```

**Operator test:** add a registry-only site (e.g. `practice`) with no Terraform contract, run Checkout for that `siteId`, confirm GitHub Actions **Platform site provision** starts.

## Slice 2b — deprovision on cancel (shipped)

When Stripe sends **`customer.subscription.deleted`** or **`customer.subscription.updated`** with status **canceled** (includes `unpaid`):

1. Platform D1 billing row is updated to `canceled`.
2. If the site was live (provisioned or had `trialing`/`active`/`past_due` billing), the platform dispatches [`platform-site-billing-deprovision.yml`](../.github/workflows/platform-site-billing-deprovision.yml) via `PLATFORM_GITHUB_TOKEN`.
3. The workflow: **archive** hub JSON to platform R2 (while the hub is still live) → open a **registry removal PR** (auto-merge when CI passes) → merge triggers [`platform-site-deprovision.yml`](../.github/workflows/platform-site-deprovision.yml) for Terraform destroy + Worker delete + manifest rebuild.
4. `site_billing.deprovision_dispatched_at` is set on success; `deprovision_last_error` on dispatch failure (webhook returns **503** for Stripe retry).
5. `invoice.payment_failed` sets **`past_due` only** — hub stays live while Stripe retries billing.

Apply migrations after deploy:

```bash
node scripts/apply-platform-billing-migration.mjs
```

**Operator test:** cancel a test subscription in Stripe Dashboard (or end a test clock) → confirm **Platform site billing deprovision** runs for that `siteId`.

### Re-trial and subscription resume

The same `site_id` can go through multiple billing cycles (throwaway test hubs, cancel → sign up again).

| Stripe event | Platform behaviour |
| --- | --- |
| **New trial / checkout** after prior deprovision | Clears stale `deprovision_dispatched_at` / `provision_dispatched_at` when status becomes `trialing` or `active` again (new subscription id or resumed from `canceled`). Re-provision runs if the manifest has no Terraform contract. |
| **Cancel** while hub is live (`trialing` / `active` / `past_due`) | Dispatches billing deprovision even if an earlier cycle already set `deprovision_dispatched_at`. |
| **Cancel at period end** (still `trialing` until period ends) | No deprovision until status becomes `canceled`. |
| **Resume** before period end (`cancel_at_period_end` cleared) | `subscription.updated` → status stays `trialing` / `active`; no deprovision. |
| **Duplicate** `subscription.deleted` webhooks | Second event skipped via `already_dispatched` once D1 status is `canceled`. |

Archive JSON in R2 is kept across cycles for optional restore ([platform-site-archive.md](./platform-site-archive.md)); automated restore on re-subscribe is not wired yet.

## Slice 3 — public signup (in progress)

### Marketing site (`lovely-home.co.uk`)

| Page | Purpose |
| --- | --- |
| `/pricing.html` | Transparent pricing — monthly amount loaded from Stripe via public API |
| `/signup.html` | Hub name + owner email → Stripe Checkout |
| `/signup-success.html` | Post-checkout “we’re provisioning your hub” |

Home page and signup link to **Pricing** and **Start free trial**.

### Public API (platform Pages, no Access)

Managed by **Terraform** on `module.platform_admin` (via `terraform/environments/hub.tfvars`):

| Terraform variable | Pages env var | Purpose |
| --- | --- | --- |
| `marketing_site_origin` | `MARKETING_SITE_ORIGIN` | CORS + Checkout return URLs (default `https://lovely-home.co.uk`) |
| `public_signup_enabled` | `PUBLIC_SIGNUP_ENABLED` | Set `true` to enable `/api/public/signup` (requires Stripe + `platform_github_token`) |

Also requires the Stripe vars from [One-time setup](#one-time-setup-test-mode). **Do not** set these only in the Cloudflare dashboard — the next `terraform apply` overwrites Pages env.

**Cloudflare Access:** Browser calls from `lovely-home.co.uk` hit `platform.lovely-home.co.uk/api/public/*`. Terraform creates a Zero Trust **bypass** application for that path (same pattern as `/api/stripe/webhook`). Without `public_signup_enabled = true` + `terraform apply`, slug checks fail with a CORS error after an Access login redirect.

When `public_signup_enabled = true`, Terraform also creates a **Zero Trust bypass** for `/api/public/*` (same pattern as the Stripe webhook). Without it, browser requests from lovely-home.co.uk hit the Access login redirect and fail CORS during slug checks.

**Pre-launch marketing site gate:** Set `marketing_site_access_protected = true` in hub tfvars to require OTP on `lovely-home.co.uk` for `platform_operator_emails` only (`terraform/modules/marketing_site`). This does not change platform Access — set `false` at public launch.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/public/signup/status` | GET | Whether signup is enabled |
| `/api/public/signup/pricing` | GET | Trial length + monthly/yearly prices from Stripe |
| `/api/public/signup/slug/{siteId}` | GET | Slug availability check |
| `/api/public/signup` | POST | Registry create + Stripe Checkout `{ siteId, customerEmail, billingInterval? }` (`month` or `year`) |
| `/api/public/hub-status/{siteId}` | GET | Provisioning status for the success page — probes `{siteId}.lovely-hub.com` and returns `{ state, ready, hubUrl }` |

Flow: validate slug → dispatch **platform-site-manage** create PR → return Stripe Checkout URL. Webhook `trialing` provisions once the registry PR merges (Stripe retries if needed).

Provisioning takes roughly **10 minutes** end to end, so `signup-success.html` polls `hub-status` and only shows the Open button and hub QR code once the hostname answers. An Access redirect or challenge counts as live — the buyer signs in next.

Deploy marketing pages after merge:

```bash
bash scripts/deploy-lovely-home-website.sh
```

Platform admin deploys from GitHub on `main`; run `terraform apply` to push env vars, or `bash scripts/deploy-platform-admin.sh` for Functions-only updates.

### Still to do

- Stripe Customer Portal link for self-service cancel
- Turnstile / rate limiting on public signup
- Automated restore from archive on re-subscribe
