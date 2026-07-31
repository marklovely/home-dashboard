# Lovely Home Hub API (Cloudflare Worker)

Proxies Alexa Virtual Buttons and serves private house configuration to the Home Hub PWA.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness check |
| POST | `/api/button/:code` | Trigger allowlisted control (`VB01` … `VB10`) |
| GET | `/api/weather` | Home weather, forecasts, and advice (cached 15 minutes; optional `?lat=&lon=` override) |
| GET | `/api/weather/geocode` | Postcode or place lookup for weather location (`?q=`) |
| POST | `/api/auth/owner` | Validate owner PIN (JSON body `{ "pin": "...." }`; secret `OWNER_PIN`) |
| GET | `/api/private-config` | Wi-Fi, contacts, home address, lockbox code (when sitter sharing enabled) |

## Local development

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars   # edit with test values
npm run dev
```

Set the dashboard `.env.local`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8787
```

## Secrets (production)

Use `wrangler secret put` — never commit real values:

- `VIRTUAL_BUTTONS_ACCESS_CODE`
- `PRIVATE_WIFI_SSID`
- `PRIVATE_WIFI_PASSWORD`
- `PRIVATE_MARK_PHONE`
- `PRIVATE_MARK_EMAIL`
- `PRIVATE_DONNA_PHONE`
- `PRIVATE_DONNA_EMAIL`
- `PRIVATE_HOME_ADDRESS`
- `OWNER_PIN` (four-digit owner unlock; never in Pages or frontend env)

**Bindings:** `OWNER_AUTH_LIMITER` — Durable Object class `OwnerAuthLimiter` for failed-attempt rate limiting (five failures per ten minutes per client IP).

Update `ALLOWED_ORIGINS` in `wrangler.toml` or as a secret/var when adding `dashboard.lovely-home.co.uk` and Cloudflare Pages preview hosts.

## Deploy

**Production:**

```bash
cd worker
npm run deploy
npm run d1:migrate:prod   # after schema changes
```

Note the `*.workers.dev` URL and set `VITE_API_BASE_URL` in Cloudflare Pages project settings.

**Test stack** (separate Worker, D1, R2 — safe for experiments):

```bash
cd worker
npm run provision:test      # once: create test D1/R2, patch wrangler.toml
npm run secrets:test        # checklist of wrangler secret put --env test
npm run d1:migrate:test
npm run deploy:test
```

See [docs/cloudflare-test-environment.md](../docs/cloudflare-test-environment.md).

## Button allowlist

`VB01` = Downstairs On, `VB02` = Bedtime, `VB08` = Master Bedroom Lights On, `VB09` = Restore Lights After Movie, `VB10` = Master Bedroom Lights Off — suffix matches Virtual Buttons numeric IDs in `src/config.js`.
