# Cloudflare Access — step-by-step setup

Follow these steps in order. You only need **Phase 1** until `dashboard.lovely-home.co.uk` DNS is on Cloudflare.

Estimated time: 45–60 minutes the first time.

---

## Before you start

You need:

- Cloudflare account with **Zero Trust** enabled (free tier is fine).
- Admin access to **Workers & Pages** for the Home Hub project and `lovely-home-hub-api` Worker.
- Terminal on your Mac with the repo cloned (`worker/` folder).
- A list of **owner emails** (you, Donna, …) and each **house-sitter email** (exact addresses).

Merge and deploy **PR #20 (security lockdown)** before turning this on in production, or the Worker will reject API calls without Access secrets configured.

---

## Which “Add application” screen to use (important)

Cloudflare shows **Add an application** with tabs. Lovely Home is **not** a private internal app.

| What you are protecting | Top tab | Sub-tab (pill buttons) | Do **not** use |
|-------------------------|---------|-------------------------|----------------|
| **Pages dashboard** (`*.pages.dev`) | **Self-hosted and private** | **Public DNS** | Private destinations |
| **Worker API** (`lovely-home-hub-api.*.workers.dev`) | **Self-hosted and private** | **Workers** (pick your Worker) **or** **Public DNS** (enter the `workers.dev` hostname) | Private destinations |

**Private destinations** is for things like `10.0.0.5` or `myapp.internal` behind a tunnel — that is why the diagram shows IP addresses. Your dashboard is on the public internet (`pages.dev`), so that sub-tab is the wrong one.

You will create **two** Access applications (Pages first, then Worker). Repeat **Add an application** twice.

---

## Step 1 — Write down your hostnames

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**.
2. Click the **Pages** project (likely named **home-dashboard** or similar).
3. Note the **production URL**, e.g. `https://home-dashboard-a11.pages.dev` → this is your **Pages hostname** (no `https://` in Access forms — hostname only).
4. Still on Pages → **Deployments** → open a preview if you use PR previews → note the preview hostname pattern.
5. Click **Workers & Pages** → open **lovely-home-hub-api** (Worker).
6. Under **Triggers** or the overview, note the **workers.dev** URL, e.g.  
   `https://lovely-home-hub-api.mark-lovely67.workers.dev`  
   → hostname only: `lovely-home-hub-api.mark-lovely67.workers.dev` — this is your **Worker hostname**.

Keep these three hostnames on a sticky note:

| Label | Hostname (example) | Yours |
|-------|-------------------|-------|
| Pages | `home-dashboard-a11.pages.dev` | |
| Worker | `lovely-home-hub-api.mark-lovely67.workers.dev` | |
| Custom (later) | `dashboard.lovely-home.co.uk` | skip for now |

---

## Step 2 — Find your Zero Trust team name

1. In Cloudflare, open **Zero Trust** (left menu, or go to [one.dash.cloudflare.com](https://one.dash.cloudflare.com)).
2. Go to **Settings** → **Custom pages** (or **Team name** / **Organization** depending on UI).
3. Note the **team name** used in login URLs:  
   `https://<TEAM_NAME>.cloudflareaccess.com`  
   Example: team name `mark-lovely67` → you will set Worker secret `CF_ACCESS_TEAM_DOMAIN` to `mark-lovely67` (the subdomain only, no `https://`).

---

## Step 3 — Create Access app for the dashboard (Pages)

1. Zero Trust → **Access** → **Applications**.
2. Click **Add an application**.
3. Top tab: **Self-hosted and private** (already selected).
4. Sub-tab: click **Public DNS** (not **Private destinations**).
5. Click **Continue** (or **Continue with Self-hosted and private**).
6. On the next screens, fill in:
   - **Application name:** `Lovely Home — Pages production`
   - **Session Duration:** e.g. 24 hours (tablet-friendly) or shorter if you prefer
   - **Public hostname / domain:** your full Pages host, e.g. `home-dashboard-a11.pages.dev`  
     (Some UIs split “subdomain” + “domain”; for `home-dashboard-a11.pages.dev` you may enter subdomain `home-dashboard-a11` and domain `pages.dev`, or one field with the full hostname.)
   - **Path:** leave empty (protect entire site)
7. Continue to **Policies** (Step 3a below).

If you do not see **Public DNS**, try **Continue** from the first screen and look for a **Public hostname** or **Domain** field on the next page — enter `home-dashboard-a11.pages.dev`.

### Step 3a — Owner policy

1. Click **Add a policy**.
2. **Policy name:** `Owners`
3. **Action:** **Allow**
4. **Configure rules** → **Include** → choose **Emails** → enter each owner email (one per line or comma-separated, e.g. `mark@…`, `donna@…`).
5. **Authentication method:** leave default or choose **One-time PIN**, **Google**, etc. for owners.
6. **Save policy**.

### Step 3b — House-sitter policy

1. **Add a policy** again.
2. **Policy name:** `House sitters`
3. **Action:** **Allow**
4. **Include** → **Emails** → add **only** approved sitter addresses (each sitter’s real email).
5. **Authentication method:** **One-time PIN** is OK here because the email is explicitly listed.
6. **Save policy**.

**Do not** add a rule **Include: Everyone**.

7. Finish creating the application (**Save application**).

Test: open `https://home-dashboard-a11.pages.dev` in a private window → you should see Cloudflare Access login, not the dashboard.

---

## Step 4 — Create Access app for the Worker API (required)

The browser calls the Worker directly for weather, controls, Wi‑Fi, calendar, etc. Without this app, the dashboard will load but API calls fail with **401**.

1. **Access** → **Applications** → **Add an application** again.
2. Top tab: **Self-hosted and private**.
3. Sub-tab: choose **Workers**.
4. **Continue** → select **`lovely-home-hub-api`** from the list (your API Worker).
5. **Application name:** `Lovely Home — Worker API`
6. **Policies:** add the **same two Allow policies** as Step 3 (Owners + House sitters with the same email lists).

**Alternative if Workers tab does not list your script:** use sub-tab **Public DNS** and enter hostname `lovely-home-hub-api.<your-subdomain>.workers.dev` (from Step 1).

7. **Save application**.

### Step 4a — Copy Application Audience (AUD) values

You need **both** Access applications’ AUD strings in one Worker secret (comma-separated):

1. Open **Lovely Home — Pages production** (Step 3) → copy **Application Audience (AUD)** → call this **Pages AUD**.
2. Open **Lovely Home — Worker API** (Step 4) → copy **Application Audience (AUD)** → call this **Worker AUD**.

You will set `CF_ACCESS_AUD` in Step 6 to: `Worker AUD,Pages AUD` (comma, no spaces required).

The Pages Function proxy forwards the **Pages** login JWT to the Worker; the Worker must accept that audience as well as the Worker app audience.

---

## Step 5 — (Optional) Protect Pages preview URLs

If GitHub PRs deploy to `https://<something>.home-dashboard-a11.pages.dev`:

1. **Add an application** → **Self-hosted**.
2. **Domain:** try `*.home-dashboard-a11.pages.dev` if Cloudflare accepts wildcards; otherwise add one app per preview hostname you care about, or restrict previews to **owners only** in a separate policy.
3. Use at least the **Owners** policy; sitters on preview is usually unnecessary.

Skip this step if you do not use public preview URLs.

---

## Step 6 — Set Worker secrets (terminal)

On your Mac:

```bash
cd /path/to/home-dashboard/worker
npx wrangler login
```

Then set each secret (Wrangler prompts for the value; paste carefully):

```bash
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
# Enter: your team name from Step 2 (e.g. mark-lovely67)

npx wrangler secret put CF_ACCESS_AUD
# Enter: Worker API AUD,Pages production AUD (comma-separated — see Step 4a)

npx wrangler secret put OWNER_EMAILS
# Enter: comma-separated owner emails only, e.g. mark@example.com,donna@example.com
# Must match emails in your Owners Access policy. Sitters are NOT listed here.
```

Confirm existing secrets are still present (re-run only if missing):

```bash
npx wrangler secret put VIRTUAL_BUTTONS_ACCESS_CODE
npx wrangler secret put OWNER_PIN
# … plus PRIVATE_* and APPLE_CALENDAR_ICS_URL if you use My Day
```

Optional:

```bash
npx wrangler secret put OWNER_SESSION_SECRET
# Use a long random string (not the same as OWNER_PIN)
```

---

## Step 7 — Deploy the Worker

```bash
cd worker
npm install
npm run deploy
```

- Approve any **Durable Object migration** prompt (`ControlActionLimiter` / v2).
- Confirm the deploy URL matches what you use for `VITE_API_BASE_URL`.

Quick check:

```bash
curl -s "https://YOUR-WORKER-HOSTNAME.workers.dev/api/health"
```

Should return JSON with `"status":"ok"`.

Protected route without login:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://YOUR-WORKER-HOSTNAME.workers.dev/api/session"
```

Should print **401** (good).

---

## Step 8 — Pages env vars (routines / API proxy)

These settings live on your **Pages site** (the dashboard HTML), **not** on the **`lovely-home-hub-api` Worker**.  
Worker secrets (`CF_ACCESS_*`, `OWNER_EMAILS`, etc.) are configured separately in **Step 6** — do not mix them up.

Official references:

- [Pages build environment variables](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)
- [Pages Functions environment variables](https://developers.cloudflare.com/pages/functions/bindings/#environment-variables) (dashboard label may say **Variables and Secrets**)

### Where to click (dashboard)

1. Open **[Cloudflare dashboard](https://dash.cloudflare.com/)** and choose your account.
2. In the **left sidebar**, click **Workers & Pages** (this is **not** **Zero Trust**, **not** **DNS**, **not** **R2**).
3. On the Workers & Pages screen, open the **Pages** list (if you only see Workers, use the **Pages** tab or filter at the top).
4. Click your **dashboard Pages project** — the one whose live URL is **`home-dashboard-a11.pages.dev`** (confirm under that project’s **Custom domains** or latest **Deployments**).  
   Do **not** open **`lovely-home-hub-api`** here; that row is the **Worker API**, not the website.
5. Open the project’s **Settings** (top navigation on the project, not account-wide Settings).
6. Find **Environment variables** and/or **Variables and Secrets** (Cloudflare uses both names in docs; it is the same place to add plain text vars for build + Functions).
7. Click **Add** / **Add variable** (Type: **Plaintext** is fine for these URLs).

Cloudflare only gives **two** scopes for Pages vars: **Production** and **Preview**. Repeat each change for **both** unless you intentionally only use production.

### What to set (for routines after Access)

| Variable | What to do | Value |
|----------|------------|--------|
| `VITE_API_BASE_URL` | **Keep** set to `https://lovely-home-hub-api.mark-lovely67.workers.dev` (Preview **and** Production) unless you enable the proxy flag below. | Worker URL |
| `VITE_USE_PAGES_API_PROXY` | Only when testing PR #21 proxy: set to **`true`**, then **unset** `VITE_API_BASE_URL`, add `WORKER_API_ORIGIN`, confirm **HUB_API** binding, update Worker `CF_ACCESS_AUD` (Pages + Worker AUDs). | `true` or unset |
| `VITE_DEPLOYMENT_MODE` | Keep as you already have it. | `home` or `house-sitter` |

Why:

- **`VITE_API_BASE_URL`** is baked into the frontend at **build** time. If it points at `workers.dev`, the browser POSTs routines cross-origin and Access can **403 the OPTIONS preflight**.
- **`WORKER_API_ORIGIN`** is read at **runtime** by the Pages Function `functions/api/[[path]].js` when the **HUB_API** service binding is unavailable (local dev). Production uses the binding in repo root `wrangler.toml` (`HUB_API` → `lovely-home-hub-api`).

**Service binding (production / preview deploys):** Repo root `wrangler.toml` declares `HUB_API` → `lovely-home-hub-api`. After deploy, in Pages → **Settings** → **Bindings**, confirm **Service binding** `HUB_API` appears. If not, add **Settings** → **Bindings** → **Add** → **Service binding** → name `HUB_API`, service **`lovely-home-hub-api`**, then redeploy.

**Worker secret:** `CF_ACCESS_AUD` must include **Pages + Worker** app AUD values (Step 4a). Without the Pages AUD, proxied `/api/*` calls return **401** for every feature.

**Local dev:** use `.env.local` at the repo root with `VITE_API_BASE_URL=http://127.0.0.1:8787` only on your Mac — nothing to set in Cloudflare for local.

### Redeploy (required)

Changing `VITE_*` does **not** update the live JS until a new build runs.

1. Stay on the same **Pages** project → **Deployments**.
2. On the latest **Production** deployment, open **⋯** → **Retry deployment** (or push a commit to trigger a build).

After deploy, DevTools → **Network**: tapping a routine should show **POST** to  
`https://home-dashboard-a11.pages.dev/api/button/VB01`, **not** to `workers.dev`.

### If you cannot find “Environment variables”

- You are almost certainly inside the **Worker** (`lovely-home-hub-api`) or **Zero Trust** — go back to **Workers & Pages** → **Pages** → **home-dashboard** → **Settings**.
- If the UI only shows **Bindings**, scroll the Settings page; **Variables and Secrets** / **Environment variables** is a separate section on the same Settings page per [Cloudflare’s bindings doc](https://developers.cloudflare.com/pages/functions/bindings/#environment-variables).

---

## Step 9 — Test in the browser

1. Private/incognito window → `https://home-dashboard-a11.pages.dev`.
2. Complete Access login as an **owner** email.
3. Dashboard should load; **weather** should update (proves Worker + JWT works).
4. Open DevTools → **Network** → click a request to your Worker → confirm request headers include **`Cf-Access-Jwt-Assertion`** (often added by Cloudflare on the Worker hostname when both are protected).
5. Log out / use another browser profile → log in as a **sitter** email → guest apps work; owner-only features (My Day) should not show owner data.
6. As owner, use in-app PIN to switch to owner mode → My Day works if calendar secret is set.

### If something fails

| What you see | Fix |
|--------------|-----|
| Access login never appears on Pages | Re-check Step 3 application domain matches exact Pages hostname |
| Dashboard loads, all API 401 / nothing works on preview | `CF_ACCESS_AUD` on Worker must include **Pages app AUD**; confirm **HUB_API** service binding on Pages project |
| API 503 | Step 6 secrets missing or Worker not redeployed after secrets |
| CORS error in console | Worker `ALLOWED_ORIGINS` must include your Pages origin; redeploy Worker from latest `wrangler.toml` |
| Routines / controls do nothing; OPTIONS to `workers.dev` is **403** | Use Step 8 proxy: clear `VITE_API_BASE_URL`, set `WORKER_API_ORIGIN`, redeploy Pages |
| Calendar 403 for you | Your login email must be in `OWNER_EMAILS`, not just Access Owners policy |

---

## Step 10 — When `dashboard.lovely-home.co.uk` is ready (Phase 2)

1. **DNS:** Finish transfer; domain uses Cloudflare nameservers; proxied (orange cloud).
2. **Pages:** Project → **Custom domains** → **Set up a custom domain** → enter `dashboard.lovely-home.co.uk` → wait for **Active** certificate.
3. **Access:** **Add application** (Self-hosted) for `dashboard.lovely-home.co.uk` — duplicate the same Owner + Sitter policies from Step 3.
4. Update wall tablet bookmark to `https://dashboard.lovely-home.co.uk`.
5. Smoke-test again (weather, controls, sitter vs owner).

Worker CORS already lists `https://dashboard.lovely-home.co.uk` in `worker/wrangler.toml`; redeploy Worker after merging if you changed vars.

---

## Adding or removing a house sitter

1. Zero Trust → **Access** → **Applications**.
2. Edit **each** of: Pages app, Worker API app, (previews/custom if used).
3. **House sitters** policy → add or remove the email → **Save**.
4. No Worker redeploy needed for sitter list changes (Access only).
5. To promote someone to owner: add email to **Owners** policy **and** add to Worker secret `OWNER_EMAILS`, then redeploy is **not** required for `OWNER_EMAILS` if you update via `wrangler secret put OWNER_EMAILS` (secret update is live immediately).

---

## Quick reference — where things live

| What | Where in Cloudflare |
|------|---------------------|
| Who can open the website | Zero Trust → Access → Applications → Policies |
| Who is “owner” for calendar/API | Worker secret `OWNER_EMAILS` |
| Worker validates JWT | Secrets `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` |
| API URL in the app | **Pages** project Settings → env vars (`WORKER_API_ORIGIN` + no `VITE_API_BASE_URL`); local → `.env.local` |
| CORS allowed origins | `worker/wrangler.toml` → `ALLOWED_ORIGINS` |

More detail: [cloudflare-access-runbook.md](./cloudflare-access-runbook.md) · [cloudflare-access.md](./cloudflare-access.md)
