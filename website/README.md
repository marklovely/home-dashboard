# Lovely Home marketing site

Static marketing pages for [lovely-home.co.uk](https://lovely-home.co.uk), deployed separately from the hub PWA (`dashboard.lovely-home.co.uk`).

## Pages

| Path | Purpose |
|------|---------|
| `/` | Product landing — demo + **Start free trial** |
| `/signup.html` | Public trial signup (hub name + email → Stripe Checkout) |
| `/signup-success.html` | Post-checkout confirmation |
| `/app.html` | Screenshot gallery |
| `/support.html` | Support & FAQ |
| `/privacy.html` | Privacy policy |

Public demo hub: [demo.lovely-home.co.uk/sign-in](https://demo.lovely-home.co.uk/sign-in) — username `demo`, password `lovely-demo`.

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

Screenshots live in `website/screenshots/` as JPEG/PNG exports from the live hub. Replace the files and redeploy after UI changes.

Brand assets:

- `lovely-home-logo-dark.png` — wordmark for the light marketing pages
- `lovely-home-logo.png` — light wordmark for dark backgrounds (hub shell / R2)
- `favicon.png` — square hub icon for browser tabs
