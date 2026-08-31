# Cloudflare Access — dashboard security lockdown

Lovely Home Hub uses **Cloudflare Access** as the outer authentication boundary. The Worker validates the Access JWT on every sensitive API request and assigns **Lovely Home roles** server-side. The browser UI mode (owner vs house sitter) is **not** authorization.

## Security model

```
Cloudflare identity (email allow-list)
        ↓
Cf-Access-Jwt-Assertion validated by Worker
        ↓
Lovely Home role
        ├── owner      (email in OWNER_EMAILS)
        └── house-sitter (any other allowed Access identity)
```

**Owner PIN** (in-app unlock) only switches what the **already authenticated** tablet shows. It does **not** replace Access. Owner-only APIs (calendar, owner PIN endpoint) require an **owner** Access identity regardless of PIN.

## Deployment runbook

Step-by-step checklist (Phase 1 before DNS, Phase 2 for `dashboard.lovely-home.co.uk`), AUD/secret commands, and smoke-test curls:

- **[cloudflare-access-setup-guide.md](./cloudflare-access-setup-guide.md)** — **start here** (click-by-click Zero Trust, Pages, Wrangler)
- [cloudflare-access-runbook.md](./cloudflare-access-runbook.md) — checklist, smoke tests, rollback

## Manual Cloudflare configuration

Perform these steps in the Cloudflare Zero Trust dashboard. This repository does **not** change your Cloudflare account automatically.

### 1. Create Access applications

Create **separate** self-hosted (or SaaS) Access applications for each public entry point. Do **not** use **Include: Everyone**.

| Hostname | Purpose |
|----------|---------|
| `dashboard.lovely-home.co.uk` | Production Pages (custom domain — **Phase 2** when DNS is live) |
| `home-dashboard-a11.pages.dev` | Production Pages default hostname |
| Pages preview deployments | Add each preview hostname or a documented wildcard policy |
| Worker production hostname | Worker API |
| Worker preview URLs | Worker preview deployments |

**Policy (owners):**

- **Action:** Allow  
- **Include:** Emails — list each owner address  
- **Authentication:** One-time PIN and/or IdP as you prefer  

**Policy (house sitters):**

- **Action:** Allow  
- **Include:** Emails — **exact address per sitter**  
- Do **not** use unrestricted “Login method = One-time PIN” without an email allow-list  

Revoking access = remove the email from the policy (Terraform `owner_emails`, site `tester_emails`, or `sitter_emails`, then `terraform apply`).

### Owner vs tester vs sitter (Terraform-managed hubs)

| List | Scope | Access policy | Worker `OWNER_EMAILS` |
|------|--------|---------------|------------------------|
| `owner_emails` (global) | Platform hubs only (`lovely-home.co.uk`) | Owners — Allow | Merged on each platform site |
| `support_owner_emails` (global) | Customer hubs only (`lovely-hub.com`) | Owners — Allow | Merged on each customer site |
| `tester_emails` (per site) | That hub only (e.g. sandbox, test) | Owners — Allow | Merged on that site |
| `sitter_emails` (global or per site) | Where listed | House sitters — Allow | Sitters are **not** owners for calendar/backup APIs |

Customer hubs deliberately do **not** inherit the global `owner_emails` list — otherwise
every address there would gain owner access to every household. A customer's own owner
address is read from the platform billing database at provision time, never committed to
`platform/sites.yaml`. Keep `support_owner_emails` limited to named operator accounts.

Example: household owners on production + sandbox; Airbnb trial guest on sandbox/test only — set `tester_emails` under `sites.sandbox` and `sites.test`, not in global `owner_emails`.

**Do not** add testers manually in Zero Trust → Access → Applications; Terraform owns those policies. Edit `hub.tfvars`, run `terraform apply`, then `node scripts/set-worker-secrets-from-terraform.mjs <site_id>`. See [platform-terraform.md — Add a tester](./platform-terraform.md#add-a-tester-sandbox--test-only).

On Terraform-managed hubs, owners can also edit the **House sitters** allow-list from **Settings → House sitter mode → Sitter login emails** or **Scheduled stays**. The hub Worker stores the list in D1 and updates Cloudflare Access via API (requires `CF_ACCESS_MANAGEMENT_TOKEN`, `ACCESS_PAGES_APP_ID`, and `ACCESS_WORKER_APP_ID` on the Worker).

### Production dashboard (`dashboard.lovely-home.co.uk`)

The default Worker (`lovely-home-hub-api`) uses top-level `wrangler.toml` `[vars]`, not `[env.production]`. Platform provision sets Access sync on new sites automatically; **production must be enabled once**:

```bash
export CLOUDFLARE_API_TOKEN='…'   # Zero Trust Access edit + Workers Scripts Edit
export CLOUDFLARE_ACCOUNT_ID='…'
node scripts/sync-wrangler-production-access.mjs
node scripts/set-production-access-sync-secret.mjs
npm run deploy --prefix worker
```

Then re-save a scheduled stay or sitter login emails in Settings — the Worker creates/updates the **House sitters** policy on both Pages and Worker Access apps.

If sync is not configured, Settings shows a warning and stays save locally without pushing emails to Cloudflare (sitters will not receive Access OTP until their email is on the policy).

### 2. Application audience (AUD)

Set Worker secret `CF_ACCESS_AUD` to the Access application audience for requests hitting the Worker.

### 3. Team domain

Set `CF_ACCESS_TEAM_DOMAIN` to your Zero Trust team subdomain (before `.cloudflareaccess.com`).

### 4. Owner emails

Set `OWNER_EMAILS` to a comma-separated list of owner addresses.

### 5. Preview deployments

Protect preview hostnames with Access or disable public previews. No alternate unprotected URL may reach the same API.

### 6. CORS

Tighten `ALLOWED_ORIGINS` for production. CORS is **not** authentication.

## Worker configuration

See `worker/.dev.vars.example` for local development (`CF_ACCESS_JWT_TEST_SECRET`, `VITE_DEV_ACCESS_JWT`).

## API summary

| Endpoint | Access JWT | Role |
|----------|------------|------|
| `GET /api/health` | No | — |
| `GET /api/session` | Yes | Any |
| `GET /api/private-config` | Yes | Owner device mode, or sitter device mode when **Sitter is here** is enabled in Settings |
| `GET /api/weather` | Yes | Any |
| `POST /api/auth/owner` | Yes | Owner email + PIN |
| `GET /api/calendar` | Yes | Owner |
| `POST /api/button/:code` | Yes | Owner only — see `CONTROL_PERMISSIONS` in Worker |

House sitters **cannot** trigger Virtual Buttons. Owners must unlock the tablet to owner mode before controls work, even if their Cloudflare Access identity is an owner email.
