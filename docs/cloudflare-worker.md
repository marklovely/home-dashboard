# Cloudflare Worker API

Lovely Home Hub uses a **Cloudflare Worker** as the secure backend for Virtual Buttons and private house configuration. The Vite PWA never sees the Virtual Buttons access code.

## Architecture

```
Cloudflare Pages (Home Hub PWA)
        │
        ▼
Cloudflare Worker (lovely-home-hub-api)
        ├── POST /api/button/VBxx  → Virtual Buttons (access code in Worker secret)
        ├── POST /api/auth/owner   → Owner PIN (OWNER_PIN Worker secret only)
        ├── GET  /api/weather      → Home forecast, advice (Open-Meteo via Worker)
        └── GET  /api/private-config → Wi-Fi, contacts, address
```

## Worker project

Location: `worker/`

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars   # local secrets — never commit
npm run dev                      # http://127.0.0.1:8787
```

## Frontend configuration

Copy `.env.example` to `.env.local`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8787
```

For production, set in **Cloudflare Pages** (frontend project only):

- `VITE_API_BASE_URL` — your `*.workers.dev` URL (or custom API hostname)
- `VITE_DEPLOYMENT_MODE=home` — for the full hub tablet (or `house-sitter` for guest-only builds)

Set the **same** `VITE_API_BASE_URL` (and deployment mode) for **Preview** environment variables, not only Production. PR preview builds use the Preview scope; without it, weather and other Worker features show as unavailable.

Do **not** set `VITE_OWNER_PIN` on Pages. Owner PIN validation runs only on the Worker via the `OWNER_PIN` secret (see below).

## Deploy Worker

**Production** (default environment):

```bash
cd worker
npx wrangler login
npx wrangler secret put VIRTUAL_BUTTONS_ACCESS_CODE
npx wrangler secret put PRIVATE_WIFI_SSID
npx wrangler secret put PRIVATE_WIFI_PASSWORD
npx wrangler secret put PRIVATE_MARK_PHONE
npx wrangler secret put PRIVATE_MARK_EMAIL
npx wrangler secret put PRIVATE_DONNA_PHONE
npx wrangler secret put PRIVATE_DONNA_EMAIL
npx wrangler secret put PRIVATE_HOME_ADDRESS
npx wrangler secret put PRIVATE_LOCKBOX_CODE
npx wrangler secret put OWNER_PIN
npm run deploy
```

**Test** (disposable stack, does not touch production data): [cloudflare-test-environment.md](./cloudflare-test-environment.md) — `npm run provision:test`, then `npm run secrets:test`, `npm run d1:migrate:test`, `npm run deploy:test`.

After pulling CMS or house-settings changes, apply D1 migrations once:

```bash
# All hub sites (prod, test, sandbox, demo, dev, smith, …)
npm run d1:migrate:all
npm run deploy:all

# Or one site
npm run d1:migrate:prod --prefix worker
npm run deploy:test --prefix worker
```

`d1:migrate:all` and `deploy:all` discover scripts from `worker/package.json`. Use `--dry-run`, `--site test`, or `--exclude prod` as needed. Requires `CLOUDFLARE_API_TOKEN` in the environment. Run migrations before deploy when schema changed.

For the **isolated test stack** (separate D1/R2/Worker), see [cloudflare-test-environment.md](./cloudflare-test-environment.md) and use `npm run d1:migrate:test` / `npm run deploy:test`.

`OWNER_PIN` is a **Worker secret**, not a Pages variable. Rate limiting for owner auth uses the `OWNER_AUTH_LIMITER` Durable Object binding defined in `worker/wrangler.toml` (applied on deploy via migrations).

For local dev, add `OWNER_PIN` to `worker/.dev.vars` (gitignored) — never commit the real PIN.

**Home weather location:** `HOME_LATITUDE` and `HOME_LONGITUDE` in `worker/wrangler.toml` `[vars]`. Update these on the Worker if you move house — the dashboard calls `GET /api/weather` (optional `?lat=&lon=` when the tablet has a Settings override). Postcode/place lookup: `GET /api/weather/geocode?q=`.

Verify:

```bash
curl -s "https://<your-worker>.workers.dev/api/health"
```

## CORS

`ALLOWED_ORIGINS` in `wrangler.toml` lists permitted browser origins:

- Local Vite (`http://localhost:5173`, `http://127.0.0.1:5173`, preview on `:4173`)
- GitHub Pages (`https://marklovely.github.io`)
- Cloudflare Pages (`https://*.pages.dev` — production and preview hostnames)
- Add `https://dashboard.lovely-home.co.uk` when the custom domain is live

Preview deployments: add a pattern such as `https://*.pages.dev` when supported, or list known preview hostnames.

## Button allowlist

The Worker only accepts `VB01`–`VB10` mapped to the same numeric Virtual Button IDs as `src/config.js`:

| Code | Control |
|------|---------|
| VB01 | Downstairs On |
| VB02 | Bedtime |
| VB03 | Garage Light On |
| VB04 | Garage Light Off |
| VB05 | Downstairs Off |
| VB06 | Watch Movie |
| VB07 | Heat to 20°C (owner only) |
| VB08 | Master Bedroom Lights On |
| VB09 | Restore Lights After Movie |
| VB10 | Master Bedroom Lights Off |

The browser sends only the code (for example `POST /api/button/VB01`).

## Rotating the Virtual Buttons access code

1. Generate a new code in Virtual Buttons.
2. `wrangler secret put VIRTUAL_BUTTONS_ACCESS_CODE`
3. Redeploy is not required for secret-only updates.
4. Confirm the old code is removed from any legacy Pages env vars (`VITE_VIRTUAL_BUTTONS_ACCESS_CODE` must stay unset).

## Cloudflare Access

Production API routes require a valid **Cloudflare Access** JWT and server-side roles. See:

- [cloudflare-access-setup-guide.md](./cloudflare-access-setup-guide.md) — **step-by-step Cloudflare UI instructions**
- [cloudflare-access.md](./cloudflare-access.md) — model and API matrix  
- [cloudflare-access-runbook.md](./cloudflare-access-runbook.md) — deployment checklist and smoke tests

After deploy, set `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, and `OWNER_EMAILS` on the Worker before the dashboard can use weather, controls, or private config.

## Tests

```bash
npm run check          # frontend + dist secret scan + worker tests
cd worker && npm test  # Worker only
```

The build step runs `scripts/check-dist-secrets.js` to ensure Virtual Buttons credentials and `VITE_OWNER_PIN` are not present in `dist/`.
