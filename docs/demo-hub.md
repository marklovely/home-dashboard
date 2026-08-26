# Public demo hub

The demo hub at [demo.lovely-home.co.uk](https://demo.lovely-home.co.uk) is an isolated Lovely Home stack for prospects and trial users. It uses username/password login instead of Cloudflare Access, reseeds overnight (London time), and excludes cameras and home controls (future paid add-ons).

## Credentials

| Field | Value |
| --- | --- |
| URL | https://demo.lovely-home.co.uk |
| Username | `demo` |
| Password | `lovely-demo` |
| Owner explore PIN | `1234` |

Override `DEMO_USERNAME` / `DEMO_PASSWORD` when running `scripts/set-worker-secrets-from-terraform.mjs demo` if you need non-default credentials.

## What's included

- Guest home, house guide (including pet care for Bailey), bins, emergency, appliance manuals, weather, and settings (appearance/help/about plus owner panels except guest mode, cameras, and utilities).
- Fictional seed data in `worker/src/lib/demoSeed.js` and `worker/fixtures/demo-guide-catalog.json`.

## What's excluded

- **Cameras** — hidden in apps and settings; not seeded as enabled.
- **Controls / routines** — app hidden; `/api/button/*` POST blocked on the demo worker.
- **Cloudflare Access** — disabled for demo via Terraform `access_enabled = false`.
- **Destructive admin** — backup, restore, factory reset, and sitter email changes return `403 DEMO_READ_ONLY`.

## Architecture

1. **Pages** — `DEMO_PUBLIC=true` enables `functions/lib/demoPagesGate.js`, which redirects unauthenticated visitors to `/sign-in` (built from `sign-in.html`). Do not add `_redirects` rules for the login path — they conflict with Cloudflare pretty URLs and cause redirect loops.
2. **Worker** — `DEMO_AUTH_ENABLED=true` on the `demo` Wrangler env; `/api/demo/login` issues an HttpOnly cookie and a sitter device session.
3. **Reseed** — hourly cron (`0 * * * *`) calls `reseedDemoHubIfNeeded()`; reseeds once per London calendar day.
4. **Terraform** — demo site sets `access_enabled = false` and omits Access AUD env vars on Pages.
5. **Demo login rate limit** — five failed sign-in attempts per client IP per ten minutes (same durable-object limiter as owner PIN).
6. **Service worker** — cache name tracks `package.json` version; new deployments activate the updated worker and reload open tabs.

## Manual reseed

After changing demo seed data, force a fresh reset without waiting for the nightly cron or editing D1:

```bash
node scripts/reseed-demo-hub.mjs demo
```

Uses `HUB_PROXY_SECRET` (from env or terraform output) to call `POST /api/demo/reseed` on the demo hostname. Deploy the Worker first if you added or changed the reseed route.

Alternatively, clear `demoLastReseedDate` on the demo D1 `site_profile` row and reload the hub (the next request triggers `ensureDemoHubSeeded`).

## Rotate demo credentials

Set `DEMO_USERNAME` and `DEMO_PASSWORD` in the environment when running `scripts/set-worker-secrets-from-terraform.mjs demo`, then redeploy Worker secrets.

## Deploy checklist

1. Merge and deploy Worker: `npm run deploy --prefix worker -- --env demo`
2. Deploy Pages project `home-dashboard-demo` (production branch)
3. Apply Terraform for demo (`access_enabled = false`) or run platform provision for `demo`
4. Set secrets: `node scripts/set-worker-secrets-from-terraform.mjs demo`
5. Attach HUB_API binding if needed: `node scripts/attach-hub-api-pages-binding.mjs demo`
6. Visit demo URL, sign in, confirm banner and apps; use PIN `1234` for owner explore

## Local development

Demo auth routes are only active when `HUB_ENVIRONMENT=demo` and `DEMO_AUTH_ENABLED=true` on the Worker. The login page is built as `dist/sign-in.html` (URL `/sign-in`) via Vite multi-page input.

## Troubleshooting redirect loops

If the browser shows `ERR_TOO_MANY_REDIRECTS` on the demo hostname:

1. Confirm the latest Pages deploy includes `sign-in.html` and **no** `_redirects` file in `dist/`.
2. In Cloudflare Pages → `home-dashboard-demo` → **Environment variables**: `DEMO_PUBLIC=true`, and remove `CF_ACCESS_*` vars if present.
3. Purge cache for `demo.lovely-home.co.uk` (Caching → Configuration → Purge Everything) — stale `_redirects` rules can persist at the edge.
4. Test with curl (expect **200** on `/sign-in`, not **308** looping):
   ```bash
   curl -sI https://demo.lovely-home.co.uk/sign-in | grep -i '^HTTP\|^location'
   ```
