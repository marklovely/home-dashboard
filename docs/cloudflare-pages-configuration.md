# Cloudflare Pages — how configuration actually works

This is the **stable setup** for Lovely Home. Use this doc when the dashboard feels confusing or when a PR mentions `wrangler.toml`, proxies, or new env var names.

You have **two separate Cloudflare projects**:

| Project | Name (typical) | What it runs |
|--------|----------------|--------------|
| **Pages** | `home-dashboard` | The dashboard website (`*.pages.dev`) |
| **Worker** | `lovely-home-hub-api` | The API (`*.workers.dev`) |

They are configured in **different places**. Do not open the Worker when you mean to set dashboard build variables.

---

## Pages: build-time variables (the dashboard website)

These are baked into the JavaScript when Cloudflare runs `npm run build`.

### Where to set them (normal setup — **no** root `wrangler.toml` in the repo)

1. [Cloudflare dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. Open **Pages** → project **`home-dashboard`** (not `lovely-home-hub-api`)
3. **Settings** → **Environment variables** (or **Variables and Secrets** for plaintext vars)

Set **Production** and **Preview** separately (Cloudflare only has those two scopes).

### Stable values (use this today)

| Variable | Production | Preview |
|----------|------------|---------|
| `VITE_API_BASE_URL` | `https://lovely-home-hub-api.mark-lovely67.workers.dev` | **Same** |
| `VITE_DEPLOYMENT_MODE` | `home` (or `house-sitter` for a guest-only build) | Same as you need |

No trailing slash on the Worker URL.

After any change to `VITE_*`, **Deployments** → **Retry deployment** (or push to the branch Pages builds from) so a new build runs.

### “Managed through wrangler.toml” message

If Settings says plaintext variables are **managed through wrangler.toml** and only **Secrets** are editable in the dashboard, a deploy included a **`wrangler.toml` at the repo root** (Pages project config). Cloudflare then treats that file as the source of truth ([docs](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)).

**Fix:**

1. Deploy a commit that **does not** contain root `wrangler.toml` ( **`main` does not include it** ).
2. **Production** should build from branch **`main`**, not an experimental PR branch.
3. Retry a **Production** deployment from that commit.
4. Return to **Settings** → **Environment variables** and set `VITE_API_BASE_URL` and `VITE_DEPLOYMENT_MODE` again for **Production** and **Preview**.

Do **not** add a root `wrangler.toml` unless you deliberately move **all** Pages vars and bindings into that file and accept dashboard lock-in.

---

## Worker: secrets and API auth

All API secrets live on the **Worker**, not Pages:

```bash
cd worker
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
npx wrangler secret put CF_ACCESS_AUD
npx wrangler secret put OWNER_EMAILS
# … see worker/.dev.vars.example and docs/cloudflare-access-setup-guide.md
```

Worker non-secret defaults (e.g. `ALLOWED_ORIGINS`, map coordinates) are in **`worker/wrangler.toml`** — that file is **only** for the API Worker, not for the Pages site.

---

## What works today vs what PR #21 tried

| Feature | Stable setup (`main`) |
|---------|------------------------|
| Weather, calendar, session | Browser calls **Worker URL** from `VITE_API_BASE_URL` |
| Access login on Pages | Zero Trust app on `*.pages.dev` |
| API auth | Worker validates Access JWT; `CF_ACCESS_AUD` = **Worker** Access app AUD |
| Routines (POST controls) | May still fail with **403 on OPTIONS** to `workers.dev` (known Access + CORS issue) |

PR **`feature/pages-api-proxy`** adds a Pages Function proxy and optional flags. It is **experimental**, caused env/dashboard confusion, and **should not drive production** until there is a single tested runbook. Prefer **`main`** + the table above for Production.

---

## Local development

Repo root `.env.local` (gitignored):

```bash
VITE_API_BASE_URL=http://127.0.0.1:8787
```

Run `npm run dev` and `cd worker && npm run dev` separately. No Cloudflare Pages env vars required on your Mac.

---

## Quick checklist when “nothing works”

1. **Production branch** in Pages → **Settings** → **Build** is **`main`** (or the branch you trust).
2. **No root `wrangler.toml`** in that branch’s latest deploy.
3. **`VITE_API_BASE_URL`** set for **both** Production and Preview on the **Pages** project.
4. New deployment after env changes (retry deploy).
5. Browser: hard refresh; if you tested PR builds, **unregister service worker** (Application → Service workers).
6. Worker secrets still set (`CF_ACCESS_*`, `OWNER_EMAILS`).

More detail: [cloudflare-access-setup-guide.md](./cloudflare-access-setup-guide.md) · [cloudflare-worker.md](./cloudflare-worker.md)
