# Hub lifecycle regression

On-demand Playwright coverage for the real signup path. **Not part of `npm test` or PR CI.** Never run against live Stripe.

The default run exercises **Lovely Home Free** (`plan: free`): API signup without hosted Checkout, wait until `GET /api/public/hub-status/{siteId}` reports a live `hub-shell`, cancel the Stripe subscription via the API, then wait until the hub is gone. Signup provision and cancel teardown are queued (not GitHub create-PRs).

Set `E2E_SIGNUP_PLAN=plus` to also run the **Lovely Home+** path (hosted Checkout + trial card). That second test is skipped by default because it is slower and flakier under Playwright.

Provisioning plus teardown often takes **25–80 minutes** per plan exercised.

## Local

```bash
npx playwright install chromium
npm run test:lifecycle
```

Lovely Home+ checkout coverage:

```bash
export E2E_SIGNUP_PLAN=plus
npm run test:lifecycle
```

If `STRIPE_SECRET_KEY` and `E2E_OWNER_EMAIL` are not exported, the test loads `stripe_secret_key` and the first platform operator email from `terraform/environments/hub.tfvars` (the same file other local scripts use). It still refuses a live key.

You can still override:

```bash
export STRIPE_SECRET_KEY=sk_test_...
export E2E_OWNER_EMAIL=you@example.com
export STRIPE_MODE=test
export E2E_SIGNUP_PLAN=free   # or plus
npm run test:lifecycle
```

Optional:

- `PLATFORM_API_ORIGIN` (default `https://platform.lovely-home.co.uk`)
- `MARKETING_ORIGIN` (default `https://lovely-home.co.uk`)
- `STRIPE_PRICE_ID` — only needed for the Plus checkout fallback when hosted Checkout stays open

The Free spec posts to `/api/public/signup` with `plan: free` and polls hub-status until the hub SPA is live. The Plus spec posts with `plan: plus`, opens hosted Checkout, selects the **Card** payment method (Stripe’s accordion hides card fields until then), and falls back to the Stripe API if card inputs never appear or Checkout stays open. `registered` follows billing (`active` for Free, `trialing`/`active` for Plus), not a lagging platform Pages manifest. After cancel it waits until the hostname is gone. Hub Access OTP is not attempted.

`e2e-…` slugs skip Turnstile and are rejected while the platform Stripe mode is **live**.

Per-site Terraform state for customer hubs lives at `home-dashboard/customers/{siteId}.tfstate` in R2. Deprovision empties that state via `terraform destroy` but leaves the object in place (or you can delete empty files manually).

## GitHub Actions

**Actions → Hub lifecycle (Stripe test) → Run workflow.** Requires:

| Name | Kind | Purpose |
|------|------|---------|
| `STRIPE_SECRET_KEY` | secret | Test key only |
| `E2E_OWNER_EMAIL` | secret | Inbox you control; the run uses `you+e2e-….@` |
| `STRIPE_MODE` | variable | Must be `test`. The job fails if it is `live` |

Optional workflow input:

| Input | Default | Purpose |
|-------|---------|---------|
| `signup_plan` | `free` | `free` runs the Free lifecycle only; `plus` also runs the Checkout lifecycle |

`STRIPE_PRICE_ID` is only required when `signup_plan` is `plus`.

Do not add this workflow to `pull_request`.
