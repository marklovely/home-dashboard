# Platform billing (Stage 3)

Stripe-managed subscriptions for customer hubs. Stripe is the **source of truth**; platform D1 mirrors subscription state via webhooks.

Related: [roadmap](./roadmap.md) §3 · [platform provision](./platform-provision.md)

## Architecture

| Component | Location |
|-----------|----------|
| Checkout + billing API | Platform Pages Functions — `/api/platform/billing/*` |
| Stripe webhooks | `/api/stripe/webhook` (no Cloudflare Access) |
| Billing mirror | D1 `lovely-home-platform-billing` → binding `PLATFORM_BILLING_DB` |
| Provision / deprovision | `trialing` webhook → GitHub **Platform site provision**; cancel/deprovision in slice 2b |

## One-time setup (test mode)

1. **Stripe Dashboard (test mode)** — create Product + recurring Price (GBP). Note `price_…`.
2. **Terraform** — optional vars on `module.platform_admin`:
   - `stripe_secret_key` = `sk_test_…`
   - `stripe_webhook_secret` = `whsec_…` (from Stripe CLI or Dashboard endpoint)
   - `stripe_price_id` = `price_…`
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
- `STRIPE_PRICE_ID`

Local dev API (`scripts/platform-admin-dev-api.mjs`) does not yet mirror billing routes — use deployed preview or `wrangler pages dev` for full billing tests.

## Operator API (Access-protected)

### Create Checkout session (14-day trial, card at signup)

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

Advance trial billing without waiting 14 days: [Stripe test clocks](https://docs.stripe.com/billing/testing/test-clocks).

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

## Slice 2b (next)

- `subscription.deleted` / failed payment → archive + deprovision
- Platform admin UI: billing status on site cards
- Public signup + marketing site trial CTA
