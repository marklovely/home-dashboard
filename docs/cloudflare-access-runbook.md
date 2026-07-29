# Cloudflare Access — deployment runbook

Use this checklist when rolling out **PR #20 / security lockdown** on Lovely Home Hub. The repo does not change your Cloudflare account; every step is manual in Zero Trust, Pages, and Wrangler.

**DNS note:** `dashboard.lovely-home.co.uk` is **not live yet** (awaiting transfer). Complete **Phase 1** now on Pages + Worker hostnames; add the custom domain in **Phase 2** when DNS points at Cloudflare.

---

## Hostname inventory

Fill in the **Your value** column from the Cloudflare dashboard (once per row).

| Role | Expected hostname | Status | Your value |
|------|-------------------|--------|------------|
| Pages production (default) | `https://home-dashboard-a11.pages.dev` | Verify in **Workers & Pages → home-dashboard → Custom domains** | |
| Pages PR previews | `https://<branch>.home-dashboard-a11.pages.dev` (pattern varies) | Same project → **Deployments** | |
| Pages custom (future) | `https://dashboard.lovely-home.co.uk` | **Pending DNS transfer** | |
| Worker API (production) | `https://lovely-home-hub-api.<account-subdomain>.workers.dev` | **Workers & Pages → lovely-home-hub-api** → Triggers | e.g. `mark-lovely67` → full URL |
| Worker previews | `https://<preview-id>.lovely-home-hub-api.<account>.workers.dev` | Optional; restrict or disable in Wrangler if unused | |
| Zero Trust team | `https://<team>.cloudflareaccess.com` | **Zero Trust → Settings → Custom pages** | Team name = `CF_ACCESS_TEAM_DOMAIN` |

**Frontend → API:** Pages env `VITE_API_BASE_URL` must be the **Worker production URL** (no trailing slash), set for **Production and Preview**.

**CORS:** Worker `ALLOWED_ORIGINS` (in `worker/wrangler.toml` or dashboard var) must include every **browser origin** that will call the API:

- `https://home-dashboard-a11.pages.dev`
- `https://*.pages.dev` (preview pattern already in wrangler)
- `https://dashboard.lovely-home.co.uk` (when live)
- Local dev origins (already listed)

CORS is **not** authentication; Access JWT + Worker roles enforce access.

---

## Phase 1 — Before custom domain (do now)

Goal: no unauthenticated path to the live dashboard or Worker API on hostnames you already use.

### 1. Zero Trust — Access applications

Create **one Access application per hostname** (or a documented wildcard where Cloudflare allows it). Application type: **Self-hosted**.

| # | Application name (suggested) | Domain | Session |
|---|------------------------------|--------|---------|
| A | `Lovely Home — Pages production` | `home-dashboard-a11.pages.dev` | Same as tablet policy |
| B | `Lovely Home — Pages previews` | `*.home-dashboard-a11.pages.dev` **or** list PR hosts | Stricter optional |
| C | `Lovely Home — Worker API` | `lovely-home-hub-api.<your-subdomain>.workers.dev` | Required for API JWT |

**Do not** use **Include: Everyone**.

**Policies (order matters — deny by default):**

1. **Owners — Allow**  
   - Include: **Emails** → each owner (Mark, Donna, …)  
   - Authentication: your choice (OTP to email, Google, etc.)

2. **House sitters — Allow**  
   - Include: **Emails** → **exact sitter address only** (one policy row per sitter, or one policy with multiple emails)  
   - Authentication: **One-time PIN** to that email is fine **only** when the email is explicitly listed  

3. **Block** (implicit if no Allow matches)

Repeat policies A–C for each application, or clone apps after the first.

**Record AUD tags:** For application **C (Worker API)**, open the app → **Overview** → copy **Application Audience (AUD)**. You will set `CF_ACCESS_AUD` to this value.

If Pages and Worker use **separate** Access apps, the Worker must validate the AUD for app **C** (the hostname the browser calls for `VITE_API_BASE_URL`). Pages apps protect the SPA; the Worker app protects API routes.

### 2. Worker secrets (production)

From repo root:

```bash
cd worker
npx wrangler login
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN    # team subdomain only, e.g. lovelyhome
npx wrangler secret put CF_ACCESS_AUD            # AUD from Worker Access app (C)
npx wrangler secret put OWNER_EMAILS             # e.g. mark@example.com,donna@example.com
```

Ensure existing secrets remain set (`VIRTUAL_BUTTONS_ACCESS_CODE`, `OWNER_PIN`, private config, `APPLE_CALENDAR_ICS_URL` for My Day, etc.).

Optional but recommended:

```bash
npx wrangler secret put OWNER_SESSION_SECRET     # dedicated signing secret; do not rely on OWNER_PIN
```

**Do not** set `CF_ACCESS_JWT_TEST_SECRET` in production (tests only).

### 3. Deploy Worker (includes DO migration v2)

```bash
cd worker
npm run deploy
```

Confirm **ControlActionLimiter** migration applies. Note the deployed `*.workers.dev` URL matches `VITE_API_BASE_URL` on Pages.

### 4. Pages environment variables

See **[cloudflare-pages-configuration.md](./cloudflare-pages-configuration.md)** (stable setup).

| Variable | Production | Preview |
|----------|------------|---------|
| `VITE_API_BASE_URL` | `https://lovely-home-hub-api.<subdomain>.workers.dev` | **Same** |
| `VITE_DEPLOYMENT_MODE` | `home` or `house-sitter` | Same as needed |

Redeploy Pages after changes. Production should build from **`main`** (no root `wrangler.toml`).

### 5. Pages CSP (SPA shell)

Worker responses use a strict CSP for JSON. The **HTML app** needs its own CSP on Pages (Transform Rules, `_headers` in `public/`, or Cloudflare dashboard). Base it on what the app actually loads:

- `script-src` — self + any Vite inline hashes if used  
- `connect-src` — self + Worker origin + nothing broad like `*`  
- `img-src` — self, guide media, weather icons as needed  
- `style-src` — self (and `'unsafe-inline'` only if required)

Document your final CSP in this file when applied.

### 6. Smoke tests (Phase 1)

Replace placeholders with your Worker URL and a valid Access JWT (browser: log in via Access, DevTools → Network → copy `Cf-Access-Jwt-Assertion` from an API request; or use local dev JWT — see `worker/.dev.vars.example`).

**Health (no JWT — should stay 200):**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  "https://lovely-home-hub-api.<subdomain>.workers.dev/api/health"
# expect: 200
```

**Protected route without JWT (should fail after deploy):**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  "https://lovely-home-hub-api.<subdomain>.workers.dev/api/session"
# expect: 401
```

**With JWT (owner email in OWNER_EMAILS):**

```bash
export JWT="<paste Cf-Access-Jwt-Assertion>"
curl -sS -H "Cf-Access-Jwt-Assertion: $JWT" \
  "https://lovely-home-hub-api.<subdomain>.workers.dev/api/session"
# expect: {"authenticated":true,"role":"owner","displayName":null}
```

**Calendar — sitter JWT (email not in OWNER_EMAILS):**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  -H "Cf-Access-Jwt-Assertion: $SITTER_JWT" \
  "https://lovely-home-hub-api.<subdomain>.workers.dev/api/calendar"
# expect: 403
```

**Control — sitter allowed code:**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  -X POST \
  -H "Cf-Access-Jwt-Assertion: $SITTER_JWT" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "https://lovely-home-hub-api.<subdomain>.workers.dev/api/button/VB01"
# expect: 200 (if Virtual Buttons configured)
```

**Control — sitter forbidden code:**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  -X POST \
  -H "Cf-Access-Jwt-Assertion: $SITTER_JWT" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "https://lovely-home-hub-api.<subdomain>.workers.dev/api/button/VB06"
# expect: 403
```

**Browser end-to-end:**

1. Open `https://home-dashboard-a11.pages.dev` → Access login → dashboard loads.  
2. Weather and house guide load (Worker JWT injected by Access on API hostname when both are protected).  
3. Log in as sitter email → no My Day / calendar; sitter controls only.  
4. Owner email → unlock owner UI with PIN → My Day loads if calendar URL configured.

If the SPA loads but API calls return **503** `AUTH_NOT_CONFIGURED`, Worker secrets are missing. If **401**, Access is not attaching JWT to Worker requests — protect the **Worker hostname** with Access (app C) and use `credentials: 'include'` (already in the app).

---

## Phase 2 — When `dashboard.lovely-home.co.uk` is live

1. **DNS:** Point the hostname to Cloudflare Pages (transfer completes; orange-cloud proxied).  
2. **Pages:** Add custom domain in the Pages project; wait for certificate active.  
3. **Access:** New application **D** — `dashboard.lovely-home.co.uk` — same Allow policies as app A.  
4. **CORS:** Confirm `https://dashboard.lovely-home.co.uk` is in Worker `ALLOWED_ORIGINS` (already in `wrangler.toml`; redeploy if you maintain vars only in dashboard).  
5. **Tablet bookmark:** Point wall tablet to custom domain.  
6. **Retire or protect** any legacy public URL (e.g. `marklovely.github.io`) if it still served the same app — either remove the deployment or add Access / stop using it.

Re-run smoke tests using the custom origin in the browser.

---

## Preview and CI (optional)

| Surface | Recommendation |
|---------|------------------|
| Pages PR previews | Separate Access app with **owner-only** emails, or disable public preview builds |
| Worker preview URLs | Disable in Wrangler or apply Access; do not leave a open `*.workers.dev` preview serving production secrets |
| Automated smoke tests | Cloudflare **Service Auth** token on a dedicated Access policy; document token rotation — not wired in repo yet |

---

## Rollback / break-glass

| Symptom | Likely cause |
|---------|----------------|
| Entire API 503 on protected routes | `CF_ACCESS_TEAM_DOMAIN` or `CF_ACCESS_AUD` not set |
| API 401 from tablet | Worker hostname not behind Access, or user not on allow-list |
| SPA loads, API CORS errors | Origin missing from `ALLOWED_ORIGINS` |
| Owner PIN works but calendar 403 | Email not in `OWNER_EMAILS` (expected for sitters) |

Temporary rollback of **authorization** only (emergency): removing Access secrets disables JWT validation config check — protected routes return **503**, not open access. Do not remove Access from Cloudflare without a coordinated plan.

---

## Related docs

- [cloudflare-access.md](./cloudflare-access.md) — security model and API matrix  
- [cloudflare-worker.md](./cloudflare-worker.md) — Worker secrets and deploy  
- [my-day-deployment.md](./my-day-deployment.md) — calendar URL and Pages env  

---

## Checklist copy-paste

**Phase 1**

- [ ] Access app: `home-dashboard-a11.pages.dev`  
- [ ] Access app: previews (wildcard or listed)  
- [ ] Access app: Worker `*.workers.dev` production hostname  
- [ ] Owner email policies on all three  
- [ ] Sitter emails explicit on all three  
- [ ] `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `OWNER_EMAILS` on Worker  
- [ ] `npm run deploy` (worker)  
- [ ] Pages `VITE_API_BASE_URL` Production + Preview  
- [ ] Pages CSP configured  
- [ ] Smoke: health 200, session 401 without JWT, session 200 with owner JWT  
- [ ] Smoke: sitter calendar 403, sitter VB06 403, sitter VB01 200  

**Phase 2 (after DNS)**

- [ ] Custom domain on Pages  
- [ ] Access app: `dashboard.lovely-home.co.uk`  
- [ ] CORS includes custom domain  
- [ ] Tablet URL updated  
- [ ] Legacy hostnames reviewed  
