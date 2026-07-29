# Cloudflare Worker API

Lovely Home Hub uses a **Cloudflare Worker** as the secure backend for Virtual Buttons and private house configuration. The Vite PWA never sees the Virtual Buttons access code.

## Architecture

```
Cloudflare Pages (Home Hub PWA)
        │
        ▼
Cloudflare Worker (lovely-home-hub-api)
        ├── POST /api/button/VBxx  → Virtual Buttons (access code in Worker secret)
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

For production, set `VITE_API_BASE_URL` in **Cloudflare Pages** environment variables to your `*.workers.dev` URL (or custom API hostname later).

## Deploy Worker

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
npm run deploy
```

Verify:

```bash
curl -s "https://<your-worker>.workers.dev/api/health"
```

## CORS

`ALLOWED_ORIGINS` in `wrangler.toml` (or Worker vars) lists permitted browser origins:

- Local Vite (`http://localhost:5173`, `http://127.0.0.1:5173`)
- GitHub Pages / Cloudflare Pages production URL
- Add `https://dashboard.lovely-home.co.uk` when the custom domain is live

Preview deployments: add a pattern such as `https://*.pages.dev` when supported, or list known preview hostnames.

## Button allowlist

The Worker only accepts `VB01`–`VB09` mapped to the same numeric Virtual Button IDs as `src/config.js`:

| Code | Control |
|------|---------|
| VB01 | Downstairs On |
| VB02 | Bedtime |
| VB09 | Restore Lights After Movie |

The browser sends only the code (for example `POST /api/button/VB01`).

## Rotating the Virtual Buttons access code

1. Generate a new code in Virtual Buttons.
2. `wrangler secret put VIRTUAL_BUTTONS_ACCESS_CODE`
3. Redeploy is not required for secret-only updates.
4. Confirm the old code is removed from any legacy Pages env vars (`VITE_VIRTUAL_BUTTONS_ACCESS_CODE` must stay unset).

## Cloudflare Access (later)

When `dashboard.lovely-home.co.uk` is protected with Cloudflare Access:

- Keep the Worker on `*.workers.dev` or a dedicated API hostname.
- Optionally require Access JWT on `/api/private-config` before returning secrets.
- Document service tokens for CI smoke tests.

## Tests

```bash
npm run check          # frontend + dist secret scan + worker tests
cd worker && npm test  # Worker only
```

The build step runs `scripts/check-dist-secrets.js` to ensure Virtual Buttons credentials are not present in `dist/`.
