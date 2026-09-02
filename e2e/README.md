# Hub lifecycle regression

On-demand Playwright coverage for the real signup path. **Not part of `npm test` or PR CI.** Never run against live Stripe.

It creates a throwaway hub (`e2e-` + random), pays with the Stripe **test** card `4242…`, waits until `GET /api/public/hub-status/{siteId}` reports a live `hub-shell`, cancels the trial via the Stripe API, then waits until the hub is gone from the registry.

Provisioning plus teardown often takes **25–80 minutes**.

## Local

```bash
npx playwright install chromium
export STRIPE_SECRET_KEY=sk_test_...
export E2E_OWNER_EMAIL=you@example.com
export STRIPE_MODE=test
npm run test:lifecycle
```

Optional:

- `PLATFORM_API_ORIGIN` (default `https://platform.lovely-home.co.uk`)
- `MARKETING_ORIGIN` (default `https://lovely-home.co.uk`)

The spec posts to `/api/public/signup` (Access-bypassed) then drives hosted Checkout in the browser. Marketing-site OTP is not required. Hub Access OTP is not attempted.

`e2e-…` slugs skip Turnstile and are rejected while the platform Stripe mode is **live**.

## GitHub Actions

**Actions → Hub lifecycle (Stripe test) → Run workflow.** Requires:

| Name | Kind | Purpose |
|------|------|---------|
| `STRIPE_SECRET_KEY` | secret | Test key only |
| `E2E_OWNER_EMAIL` | secret | Inbox you control; the run uses `you+e2e-….@` |
| `STRIPE_MODE` | variable | Must be `test`. The job fails if it is `live` |

Do not add this workflow to `pull_request`.
