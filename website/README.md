# Lovely Home marketing site

Static marketing pages for [lovely-home.co.uk](https://lovely-home.co.uk), deployed separately from the hub PWA (`dashboard.lovely-home.co.uk`).

## Pages

| Path | Purpose |
|------|---------|
| `/` | Product landing — demo + **Start free trial** + pricing summary |
| `/included.html` | What the hub includes, what needs your own account, what is not included |
| `/setup.html` | Tablet, Fully Kiosk / PWA, wizard, inviting a sitter |
| `/security.html` | Isolation, sign-in, sitter limits, storage, backup — claims we can stand behind |
| `/pricing.html` | Full transparent pricing (live amount from platform API) |
| `/signup.html` | Public trial signup (hub name + email → Stripe Checkout) |
| `/signup-success.html` | Post-checkout confirmation with live provisioning status |
| `/app.html` | Screenshot gallery |
| `/support.html` | Support & FAQ |
| `/privacy.html` | Privacy policy |
| `/terms.html` | Terms of service |

Public demo hub: [demo.lovely-home.co.uk/sign-in](https://demo.lovely-home.co.uk/sign-in) — username `demo`, password `lovely-demo`.

Pricing on the marketing site is **£9.99/month or £99/year** (loaded live from `GET /api/public/signup/pricing` on the platform Worker, backed by `STRIPE_PRICE_ID` and `STRIPE_PRICE_ID_YEARLY`). The trial is **7 days** (`TRIAL_PERIOD_DAYS` in platform billing). Change prices in Stripe + Terraform — the website updates after deploy.

## Hub provisioning status on the success page

`signup-success.js` polls `GET /api/public/hub-status/<siteId>` on the platform (server-side HTTPS probe of the hub hostname). Until the hub SPA is serving, the page shows "Deploying your hub now" with the address as text only; once the hub HTML is live, it turns the address into a link and reveals the Open button plus a QR code. If billing records `registry_last_error` or `provision_last_error`, the page stops immediately and asks the buyer to email support (no QR). After **30 minutes** without a live hub it also asks for support instead of handing over a QR to an address that never answered. Typical builds take about **10 minutes**.

## Vendored QR bundle

`vendor/lovely-qr.js` is generated — this site has no build step, so the `qrcode` encoder plus the shared centre-badge overlay (`src/lib/qrLogoBadge.js`) are bundled and committed. Regenerate after changing either:

```bash
npm run build:website-qr
```

The website deploy script runs this automatically when `node_modules` is present.

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
