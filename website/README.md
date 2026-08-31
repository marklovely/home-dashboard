# Lovely Home marketing site

Static marketing pages for [lovely-home.co.uk](https://lovely-home.co.uk), deployed separately from the hub PWA (`dashboard.lovely-home.co.uk`).

## Pages

| Path | Purpose |
|------|---------|
| `/` | Product landing — demo + **Start free trial** + pricing summary |
| `/pricing.html` | Full transparent pricing (live amount from platform API) |
| `/signup.html` | Public trial signup (hub name + email → Stripe Checkout) |
| `/signup-success.html` | Post-checkout confirmation |
| `/app.html` | Screenshot gallery |
| `/support.html` | Support & FAQ |
| `/privacy.html` | Privacy policy |

Public demo hub: [demo.lovely-home.co.uk/sign-in](https://demo.lovely-home.co.uk/sign-in) — username `demo`, password `lovely-demo`.

Pricing on the marketing site is **£9.99/month or £99/year** (loaded live from `GET /api/public/signup/pricing` on the platform Worker, backed by `STRIPE_PRICE_ID` and `STRIPE_PRICE_ID_YEARLY`). The trial is **7 days** (`TRIAL_PERIOD_DAYS` in platform billing). Change prices in Stripe + Terraform — the website updates after deploy.

## Local preview

```bash
npx serve website
# open http://localhost:3000
```

## Deploy

Requires Cloudflare Pages project **`lovely-home`** and `wrangler` auth:

```bash
bash scripts/deploy-lovely-home-website.sh
```

Attach the custom domain **lovely-home.co.uk** (and optionally **www**) in the Cloudflare dashboard after the first deploy. Point DNS at Cloudflare when the domain transfer from Hostinger is complete.

### Pre-launch Access gate

While building before public launch, protect the site with Cloudflare Zero Trust (OTP for platform operators only):

```hcl
# terraform/environments/hub.tfvars
marketing_site_access_protected = true
```

Then `terraform apply` from `terraform/` (uses `platform_operator_emails`). Set `marketing_site_access_protected = false` when you go live.

This gates **lovely-home.co.uk** only. The public signup API on **platform.lovely-home.co.uk** (`/api/public/*`) keeps its existing Access bypass — signup flows from the marketing site are unaffected once the site is public.

Screenshots live in `website/screenshots/` as JPEG/PNG exports from the live hub. Replace the files and redeploy after UI changes.

Brand assets:

- `lovely-home-logo-dark.png` — wordmark for the light marketing pages
- `lovely-home-logo.png` — light wordmark for dark backgrounds (hub shell / R2)
- `favicon.png` — square hub icon for browser tabs
