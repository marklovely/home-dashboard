# Lovely Home marketing site

Static marketing pages for [lovely-home.co.uk](https://lovely-home.co.uk), deployed separately from the hub PWA (`dashboard.lovely-home.co.uk`).

## Pages

| Path | Purpose |
|------|---------|
| `/` | Product landing — demo + **Start free trial** + pricing summary |
| `/included.html` | What the hub includes, what needs your own account, what is not included |
| `/setup.html` | Redirects to Help → Set it up |
| `/security.html` | Isolation, sign-in, sitter limits, storage, backup — claims we can stand behind |
| `/pricing.html` | Full transparent pricing (live amount from platform API); common questions from Help |
| `/signup.html` | Public trial signup (hub name + email → Stripe Checkout) |
| `/signup-success.html` | Post-checkout confirmation with live provisioning status |
| `/account.html` | Owner account: email code, then Stripe Customer Portal |
| `/help.html` | Owner and guest how-to guides (same copy as the hub), starting with Set it up and Common questions |
| `/app.html` | Screenshot gallery |
| `/support.html` | Contact form, common questions, billing links, and entry to Help |
| `/privacy.html` | Privacy policy, including cookies |
| `/terms.html` | Terms of service |

Public demo hub: [demo.lovely-home.co.uk/sign-in](https://demo.lovely-home.co.uk/sign-in) — username `demo`, password `lovely-demo`.

Pricing on the marketing site is **£9.99/month or £99/year** (loaded live from `GET /api/public/signup/pricing` on the platform Worker, backed by the **active** Stripe mode’s price ids). The trial is **7 days** (`TRIAL_PERIOD_DAYS` in platform billing). Change prices in Stripe + Terraform, then switch Test/Live from platform admin — the website updates after deploy.

## Hub provisioning status on the success page

`signup-success.js` polls `GET /api/public/hub-status/<siteId>` on the platform (server-side HTTPS probe of the hub hostname). Until the hub SPA is serving, the page shows "Deploying your hub now" with the address as text only; once the hub HTML is live, it turns the address into a link and reveals the Open button plus a QR code. If billing records `registry_last_error` or `provision_last_error`, the page stops immediately and asks the buyer to email support (no QR). After **30 minutes** without a live hub it also asks for support instead of handing over a QR to an address that never answered. Typical builds take about **10 minutes**.

## Vendored QR bundle

`vendor/lovely-qr.js` is generated — this site has no build step, so the `qrcode` encoder plus the shared centre-badge overlay (`src/lib/qrLogoBadge.js`) are bundled and committed. Regenerate after changing either:

```bash
npm run build:website-qr
```

The website deploy script runs this automatically when `node_modules` is present.

## Hub help catalog

`help-data.js` is generated from the hub owner and guest guides. After editing `src/help/`, regenerate:

```bash
npm run build:website-help
```

CI fails if that file is stale.

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

While building before public launch, protect the site with Cloudflare Zero Trust (email OTP):

```hcl
# terraform/environments/hub.tfvars
marketing_site_access_protected = true
```

Then `terraform apply` from `terraform/`. Platform operators (`platform_operator_emails`) can always OTP in — they also reach **platform.lovely-home.co.uk**.

Add extra preview emails from **Marketing site access** on the platform dashboard. Those guests can open the marketing site only; they do not get the dashboard. Do not put a previewer in `platform_operator_emails` unless they should.

Set `marketing_site_access_protected = false` when you go live.

This gates **lovely-home.co.uk** only. The public signup API on **platform.lovely-home.co.uk** (`/api/public/*`) keeps its existing Access bypass — signup flows from the marketing site are unaffected once the site is public.

Screenshots live in `website/screenshots/` as JPEG/PNG exports from the live hub. Replace the files, then `npm run sync:brand-media` (also run by the website deploy script) so they land in R2 bucket `lovely-home-media`.

Brand assets (git is the source of truth; `npm run sync:brand-media` copies them into R2 bucket `lovely-home-media`). Hubs load the wordmark from R2 via authenticated `GET /api/branding/logo`. Marketing Pages still ships the same files so Open Graph tags and `npx serve website` work without a public media hostname.

- `lovely-home-mark.svg` — cottage mark for the header lockup (scales on any screen)
- `lovely-home-icon.svg` / `favicon.png` — rounded forest icon for tabs and QR badges
- `lovely-home-og.png` — Open Graph image
- `lovely-home-lockup-light.svg` / `lovely-home-lockup-dark.svg` — sources for raster wordmarks
- `../assets/lovely-home-logo.png` — light wordmark on dark (`lovely-home-logo.png` in R2)

A public `media.lovely-home.co.uk` custom domain is not attached yet; until it is, keep serving marketing `<img>` from Pages and the hub logo from the Worker.
