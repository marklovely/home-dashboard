# Cloudflare test environment

Production Lovely Home Hub and disposable **test** stacks must never share Worker secrets, D1 rows, or R2 objects. The repo defines a separate Wrangler environment `test` for safe CMS experiments, onboarding wizard work, and import/export trials.

## What is isolated


| Resource            | Production (default)            | Test (`--env test`)                  |
| ------------------- | ------------------------------- | ------------------------------------ |
| Worker              | `lovely-home-hub-api`           | `lovely-home-hub-api-test`           |
| D1                  | `lovely-home-appliance-manuals` | `lovely-home-appliance-manuals-test` |
| R2 guides           | `lovely-home-appliance-guides`  | `lovely-home-appliance-guides-test`  |
| R2 media            | `lovely-home-guide-media`       | `lovely-home-guide-media-test`       |
| Pages (recommended) | `home-dashboard`                | `home-dashboard-test`                |


PR **Preview** builds on the production Pages project still proxy to the **production** Worker unless you change Preview env vars. Use the dedicated test Pages project when you need end-to-end isolation.

> **Production vs test secrets**
>
> `wrangler secret put` without `--env test` updates the **production** Worker (`lovely-home-hub-api`). Test secrets never touch production **as long as every command includes `--env test`**.
>
> Before confirming, check the Worker name Wrangler shows — it must be `lovely-home-hub-api-test`, not `lovely-home-hub-api`.
>
> | Command | Updates |
> |---------|---------|
> | `npx wrangler secret put NAME` | Production Worker only |
> | `npx wrangler secret put NAME --env test` | Test Worker only |

---



## One-time provisioning

**Recommended (Terraform):** see [platform-terraform.md](./platform-terraform.md) — `terraform apply` for managed sites in `platform/sites.yaml`.

**Legacy (Wrangler only):** from the repo root:

```bash
cd worker
npm run provision:test
```

This script:

1. Creates the test D1 database and R2 buckets (skips if they already exist).
2. Replaces `REPLACE_AFTER_PROVISION_TEST` in `worker/wrangler.toml` with the real `database_id`.

Commit the updated `database_id` so teammates deploy the same test DB binding.

---



## Worker secrets (test only)

Set secrets on the **test** Worker — use dummy values, not production PINs or Wi-Fi:

```bash
cd worker
npm run secrets:test
```

Or individually:

```bash
npx wrangler secret put OWNER_PIN --env test
npx wrangler secret put VIRTUAL_BUTTONS_ACCESS_CODE --env test
npx wrangler secret put PRIVATE_WIFI_SSID --env test
npx wrangler secret put PRIVATE_WIFI_PASSWORD --env test
npx wrangler secret put PRIVATE_MARK_PHONE --env test
npx wrangler secret put PRIVATE_MARK_EMAIL --env test
npx wrangler secret put PRIVATE_DONNA_PHONE --env test
npx wrangler secret put PRIVATE_DONNA_EMAIL --env test
npx wrangler secret put PRIVATE_HOME_ADDRESS --env test
npx wrangler secret put PRIVATE_LOCKBOX_CODE --env test
npx wrangler secret put HUB_PROXY_SECRET --env test
npx wrangler secret put CF_ACCESS_AUD --env test
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN --env test
npx wrangler secret put OWNER_EMAILS --env test
```

Suggested test values: PIN `0000`, fake Wi-Fi, `test@example.com` contacts, a random `HUB_PROXY_SECRET`.

**Do not set `APPLE_CALENDAR_ICS_URL` on the test Worker.** My Day shows a setup guide on test instead of anyone’s calendar. If that secret was copied from production, delete it: `npx wrangler secret delete APPLE_CALENDAR_ICS_URL --env test`, then redeploy the test Worker so `HUB_ENVIRONMENT=test` blocks `/api/calendar` even if the secret returns.

**`HUB_API` is not a Worker secret.** It is a **Pages service binding** (dashboard only): Pages → your project → **Settings → Bindings → Service binding** → variable name `HUB_API`, service `lovely-home-hub-api-test`. The Pages Function calls the Worker through that binding; you configure it on the **Pages** project, not with `wrangler secret put`.

| Setting | Where | Test value |
|---------|--------|------------|
| Worker secrets (`OWNER_PIN`, `CF_ACCESS_AUD`, …) | `wrangler secret put … --env test` | Test Worker |
| `HUB_PROXY_SECRET` | **Both**: Worker secret (`--env test`) **and** Pages plaintext env var | Same random string on both |
| `HUB_API` | **Pages binding only** (not Worker, not wrangler) | Service `lovely-home-hub-api-test` |
| `WORKER_API_ORIGIN`, `CF_ACCESS_AUD_PAGES`, … | Pages plaintext env vars | Test Pages project |

---



## Deploy test Worker and apply migrations

```bash
cd worker
npm run d1:migrate:test
npm run deploy:test
```

Note the URL: `https://lovely-home-hub-api-test.<account>.workers.dev`

Health check:

```bash
curl -s "https://lovely-home-hub-api-test.<account>.workers.dev/api/health"
```

---



## Pages project `home-dashboard-test`

Create a **second** Cloudflare Pages project connected to the same GitHub repo (or deploy `dist/` manually). Mirror production proxy setup from [cloudflare-pages-configuration.md](./cloudflare-pages-configuration.md), but bind the **test** Worker.

### Environment variables (Production on test project)


| Name                    | Value                                                    |
| ----------------------- | -------------------------------------------------------- |
| `WORKER_API_ORIGIN`     | `https://lovely-home-hub-api-test.<account>.workers.dev` |
| `VITE_DEPLOYMENT_MODE`  | `home`                                                   |
| `VITE_HUB_ENVIRONMENT`  | `test` (shows TEST banner in the UI)                     |
| `CF_ACCESS_TEAM_DOMAIN` | Your Zero Trust team slug                                |
| `CF_ACCESS_AUD_PAGES`   | AUD for the **test Pages** Access application            |
| `HUB_PROXY_SECRET`      | Same random string as Worker secret on **test** Worker   |




### Service binding (Pages dashboard — not a Worker secret)

**Settings → Bindings → Add → Service binding**

| Variable name | Worker service             |
| ------------- | -------------------------- |
| `HUB_API`     | `lovely-home-hub-api-test` |

This wires the Pages `/api/*` proxy to the test Worker. There is nothing to add on the Worker itself for `HUB_API`.

Redeploy after saving variables and the binding.

### Zero Trust Access (required — causes “Invalid redirect URL” if wrong)

You need **two new Access applications** for the test stack (do not reuse production hostnames or AUDs):

#### 1. Test Pages app

1. Zero Trust → **Access** → **Applications** → **Add application** → **Self-hosted** → **Public DNS**.
2. **Application domain:** the **exact** hostname from Pages → `home-dashboard-test` → **Custom domains** (e.g. `home-dashboard-test.pages.dev` or `home-dashboard-test-a11.pages.dev` — copy it exactly, no `https://`).
3. **Path:** leave empty (entire site).
4. Add the same **Allow** policies as production (Owners + House sitters emails).
5. **Save** → copy this app’s **Application Audience (AUD)** tag.

On the **test Pages project**, set `CF_ACCESS_AUD_PAGES` to that **test Pages AUD only** (not production’s AUD).

#### 2. Test Worker app

1. **Add application** → **Self-hosted** → **Workers**.
2. Select **`lovely-home-hub-api-test`** (not the production Worker).
3. Same email policies → **Save** → copy the **Worker app AUD**.

On the **test Worker** (every command with `--env test`):

```bash
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN --env test
# Team slug only, e.g. mark-lovely67 (same as production — not the full cloudflareaccess.com URL)

npx wrangler secret put CF_ACCESS_AUD --env test
# TEST_WORKER_AUD,TEST_PAGES_AUD   (comma between hex strings — no quotes)

npx wrangler secret put OWNER_EMAILS --env test
# owner1@example.com,owner2@example.com

npx wrangler secret put HUB_PROXY_SECRET --env test
# Same random string as on test Pages (plaintext env var there)
```

**Both** `CF_ACCESS_TEAM_DOMAIN` **and** `CF_ACCESS_AUD` are required. If either is missing on the test Worker, every `/api/*` call returns **503** (`AUTH_NOT_CONFIGURED`) — including `device-session`, `weather`, and `calendar`.

Redeploy **Pages** after changing `CF_ACCESS_AUD_PAGES`. Worker secret updates do not require redeploy.

Do **not** reuse production AUD tags unless you intentionally share policies.

**Custom domain:** If you use e.g. `test.lovely-home.co.uk`, the Access application domain must be that hostname (not only `*.pages.dev`). `CF_ACCESS_AUD_PAGES` must be the AUD from that Access app, and the test Worker `CF_ACCESS_AUD` must include it alongside the test Worker app AUD.

### Empty test database vs production content

`npm run d1:migrate:test` reporting **No migrations to apply** is correct — the schema exists; the database is just **empty**. Until you **import a starter guide** in the hub setup wizard (or restore a backup you intend for test), the hub shows a **neutral placeholder** — not the production `guide-catalog.json` with Scooter and Rose Cottage content. Production may additionally have CMS rows in its D1 that test does not.

To tell environments apart: a **TEST ENVIRONMENT** banner appears when `VITE_HUB_ENVIRONMENT=test` is set on the test Pages build (also auto-detected on `test.lovely-home.co.uk`).

### Vanilla defaults on test (start from scratch)

The test stack is meant for onboarding trials, not your production home setup:

| Feature | Production | Test (`VITE_HUB_ENVIRONMENT=test`) |
|---------|------------|-------------------------------------|
| **Controls / Alexa routines** | `src/config.js` Virtual Buttons | Hidden — empty config until you add buttons for that deployment |
| **Bin schedule** | East Hampshire calendar in repo | Generic **demo** fortnightly schedule and placeholder collection copy |
| **My Day / calendar** | Apple or Google ICS via Worker secret | **No personal calendar** — in-app setup guide only; `/api/calendar` blocked on test Worker |
| **House Guide** | D1 CMS + bundled fallback | **Neutral placeholder only** — no Rose Cottage / Scooter content; Scooter app hidden; bundled guide import blocked |
| **Weather location** | Worker default coordinates | Set from **postcode** in hub setup (Guest access step) |

Production `src/config.js` and bin calendar files are **not** copied to test automatically. Copy a prod guide backup via Settings if you want realistic content; Controls still stay hidden on test until you deliberately configure a test `config.js` build.

**Copy prod guide to test:** Settings → Backup & restore → download on prod, restore on test. See [site-backup.md](./site-backup.md).

---

### Troubleshooting: “Invalid redirect URL”

This appears **during Access login**, before the dashboard loads.

Checklist:

1. **Exact hostname** — In Pages → test project → **Custom domains**, copy the full `*.pages.dev` host. Open that URL in a private window (not production, not a preview URL from the prod project).
2. **Access app exists for that hostname** — Zero Trust → Access → Applications → your test Pages app → domain must match **character for character** (including the `-a11` suffix if Cloudflare assigned one).
3. **`CF_ACCESS_AUD_PAGES` is the test Pages app AUD** — Not production’s AUD. Wrong AUD often still triggers login, then fails with invalid redirect.
4. **Two apps, two AUDs on the Worker** — `CF_ACCESS_AUD` on test Worker = `test-worker-aud,test-pages-aud` (comma-separated).
5. **Not a preview URL** — PR previews on the **production** Pages project use a different hostname; they need their own Access app or use the dedicated test project URL instead.

Quick isolation test: temporarily **remove** `CF_ACCESS_AUD_PAGES` and `CF_ACCESS_TEAM_DOMAIN` from the test Pages project and redeploy. The site should load **without** Access (API may still 401). If login error persists, the redirect is coming from somewhere else (bookmark, wrong URL). Restore the vars and fix the Access app domain.

After Access login works, open **`/api/access-probe`** while logged in — expect `canForwardJwt: true` and `usesHubApiBinding: true`.

### Troubleshooting: Guide Editor blocked / “Owner Mode only”

The **Viewing as → Owner** toggle is UI-only. The editor also requires **`GET /api/device-session`** to succeed (`200`). If that call returns **401** or **503**, editing is blocked even when Owner is selected.

While logged in on `test.lovely-home.co.uk`, open DevTools → Network:

| `/api/device-session` status | Likely fix |
|------------------------------|------------|
| **503** `AUTH_NOT_CONFIGURED` | Test Worker missing **`CF_ACCESS_TEAM_DOMAIN`** and/or **`CF_ACCESS_AUD`** — run `npx wrangler secret list --env test` and set both with `--env test` |
| **401** | Test Worker `HUB_PROXY_SECRET` must match test Pages env; `CF_ACCESS_AUD` must include test Pages + test Worker AUDs |
| **200** | Session OK — empty test D1 should show **Import bundled guide** onboarding in the editor |

Verify secrets on the **test** Worker (names only):

```bash
cd worker
npx wrangler secret list --env test
```

You should see at least: `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `HUB_PROXY_SECRET`, `OWNER_EMAILS`.

Open **`/api/device-session`** response body in DevTools — if it says `"error":"AUTH_NOT_CONFIGURED"`, the fix is Worker secrets above, not Owner Mode.

Also set **`OWNER_EMAILS`** on the test Worker to your login email (comma-separated owners).

---



## Local frontend against test Worker

Copy `.env.test.example` to `.env.local` at the repo root when you want Vite to call the deployed test API directly (bypasses Pages proxy):

```bash
cp .env.test.example .env.local
# edit VITE_API_BASE_URL to your test workers.dev URL
npm run dev
```

For local Worker dev with test-like secrets, copy `worker/.dev.vars.test.example` to `worker/.dev.vars`.

---



## npm scripts (worker/)


| Script            | Command                                       |
| ----------------- | --------------------------------------------- |
| `provision:test`  | Create test D1/R2 and patch `wrangler.toml`   |
| `deploy:test`     | `wrangler deploy --env test`                  |
| `d1:migrate:test` | Apply D1 migrations to test database          |
| `d1:migrate:prod` | Apply D1 migrations to production database    |
| `secrets:test`    | Interactive checklist for test Worker secrets |


Production deploy remains `npm run deploy` (default environment).

---



## Resetting test data

Safe to wipe without affecting production:

```bash
# Export first if you need a snapshot (Milestone C will add richer export)
cd worker
npx wrangler d1 export lovely-home-appliance-manuals-test --remote --env test --output=test-backup.sql

# Re-apply migrations on empty DB, or delete/recreate via dashboard
npm run d1:migrate:test
```

Empty test R2 buckets from the Cloudflare dashboard or `wrangler r2 object delete` as needed.

---



## Related docs

- [cloudflare-worker.md](./cloudflare-worker.md) — API overview and production deploy
- [cloudflare-pages-configuration.md](./cloudflare-pages-configuration.md) — Pages proxy and Access
- [platform-terraform.md](./platform-terraform.md) — Terraform provisioning for sandbox and future sites
- [cloudflare-access-setup-guide.md](./cloudflare-access-setup-guide.md) — Zero Trust UI steps

