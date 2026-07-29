# Cloudflare Pages — production API setup

Lovely Home **cannot** call the Worker at `*.workers.dev` directly from the browser when **both** sit behind Cloudflare Access: preflight `OPTIONS` is blocked and the Pages login cookie does not authenticate the Worker hostname.

**Production fix:** the dashboard calls **`/api/...` on the same Pages host**. A **Pages Function** forwards requests to the Worker and passes the **Pages** Access JWT (`Cf-Access-Jwt-Assertion`).

There is **no** `wrangler.toml` at the repo root (that file would lock env vars to git and disable normal dashboard editing).

---

## One-time Cloudflare setup (Production + Preview)

### 1. Pages project `home-dashboard`

**Settings → Environment variables** (plaintext):

| Name | Value |
|------|--------|
| `WORKER_API_ORIGIN` | `https://lovely-home-hub-api.mark-lovely67.workers.dev` |
| `VITE_DEPLOYMENT_MODE` | `home` |

`VITE_API_BASE_URL` is **optional** on Pages — production builds ignore it for API calls and use `/api` instead. You may leave it set to the Worker URL for clarity; it does not change production behaviour.

**Settings → Bindings → Add → Service binding**

| Variable name | Worker service |
|---------------|----------------|
| `HUB_API` | `lovely-home-hub-api` |

The binding is required so the proxy reaches the Worker without hitting Worker Access on the public `workers.dev` URL.

Redeploy **Production** (and **Preview** if you use PR previews) after saving.

### 2. Worker secret `CF_ACCESS_AUD` (both AUD values)

The proxy sends the **Pages** Access JWT. The Worker must accept that audience **and** the Worker app audience.

```bash
cd worker
npx wrangler secret put CF_ACCESS_AUD
```

Paste: **`WORKER_APP_AUD,PAGES_APP_AUD`** (comma between the two hex strings from Zero Trust → Access → each application → Application Audience).

No Worker redeploy needed after a secret update.

### 3. Browser after deploy

Hard refresh or **Application → Service workers → Unregister** once (older SW versions cached `/api` responses).

---

## Local development

Repo root `.env.local`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8787
```

No Pages Function locally — API calls go straight to wrangler.

---

## Verify

Logged into `https://home-dashboard-a11.pages.dev`, DevTools → Network:

- Requests go to **`/api/weather`**, **`/api/session`**, etc. on **pages.dev**
- Not to `lovely-home-hub-api...workers.dev`

While logged in, open **`/api/access-probe`**. You want `canForwardJwt: true` and `usesHubApiBinding: true`. If `canForwardJwt` is false, Access is not reaching `/api/*`. If `usesHubApiBinding` is false, add the **HUB_API** binding and redeploy Pages. If weather works but PIN shows **Cloudflare Access session missing**, update Worker secret **`CF_ACCESS_AUD`** to include both Pages and Worker application AUD values (comma-separated).

`curl` without your Access session is not a valid test of the dashboard.

---

## If Settings say “managed through wrangler.toml”

Deploy a commit **without** a root `wrangler.toml`, then retry Production deployment. Edit plaintext vars in the dashboard again.

See also: [cloudflare-access-setup-guide.md](./cloudflare-access-setup-guide.md)
