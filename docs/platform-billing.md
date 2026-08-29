# Platform billing (Stage 3)

Stripe-managed subscriptions for customer hubs. Stripe is the **source of truth**; platform D1 mirrors subscription state via webhooks.

Related: [roadmap](./roadmap.md) §3 · [platform provision](./platform-provision.md)

## Architecture

| Component | Location |
|-----------|----------|
| Checkout + billing API | Platform Pages Functions — `/api/platform/billing/*` |
| Stripe webhooks | `/api/stripe/webhook` (no Cloudflare Access) |
| Billing mirror | D1 `lovely-home-platform-billing` → binding `PLATFORM_BILLING_DB` |
| Provision / deprovision | Slice 2 — webhook → GitHub Actions (not wired yet) |

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

## Slice 2 (next)

- Webhook `customer.subscription.created` (`trialing`) → auto-provision hub
- `subscription.deleted` / failed payment → archive + deprovision
- Platform admin UI: billing status on site cards
