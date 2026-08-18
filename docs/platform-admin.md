# Platform admin dashboard

Mark-only operator UI for deploying and managing Lovely Home Hub **sites** (production, test, sandbox, future tenants). Not shown to household owners or Airbnb guests.

## Architecture

| Piece | Location |
|-------|----------|
| Site registry | `platform/sites.yaml` |
| Live infra contract | `terraform output -json sites` |
| Built manifest | `platform-admin/public/platform-manifest.json` (generated) |
| Admin UI | `platform-admin/` — separate Vite app → `dist-platform/` |
| Operator API | `platform-admin/functions/api/` (Pages Functions) |

Household hub tablets use the main `src/` app. Platform admin is a **separate Pages project** at `platform.lovely-home.co.uk` with its own Access app — operator email allowlist only. **No Worker or HUB_API binding** — API is `functions/api/platform/` on the same repo.

## Local development

```bash
npm run platform:manifest   # merge sites.yaml + terraform output
npm run dev:platform        # API on :8791, UI on :5174
```

Open http://localhost:5174 — dev API skips Cloudflare Access (uses `PLATFORM_OPERATOR_EMAILS` default `dev@localhost`).

## Terraform + deploy

Enable in `terraform/environments/hub.tfvars`:

```hcl
platform_operator_emails = ["marklovely67@gmail.com"]

platform_admin = {
  enabled    = true
  hostname   = "platform.lovely-home.co.uk"
  pages_name = "home-dashboard-platform"
}
```

```bash
export CLOUDFLARE_API_TOKEN="..."
cd terraform && terraform apply -var-file=environments/hub.tfvars
```

Creates **Pages** (`home-dashboard-platform`), **Access** (operators only), and **DNS** — no Worker/D1/R2.

First deploy (includes Pages Functions — copied into `dist-platform/functions` by the deploy script):

```bash
unset CLOUDFLARE_API_TOKEN
npx wrangler login
bash scripts/deploy-platform-admin.sh
```

Git-connected Production builds run `npm run build:platform`; use the deploy script when Functions or env vars change.

### Pages env vars (Terraform-managed)

| Variable | Purpose |
|----------|---------|
| `CF_ACCESS_TEAM_DOMAIN` | Zero Trust team slug |
| `CF_ACCESS_AUD_PAGES` | Access app AUD for platform hostname |
| `PLATFORM_OPERATOR_EMAILS` | Comma-separated operator emails |
| `PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID` | Access service token client ID (Terraform) |
| `PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET` | Access service token secret (Terraform) |

Health probes call each hub site's `/api/health` and `/api/access-probe`. Those URLs are Access-protected, so Terraform creates a **service token** on the platform Pages project and adds an `any_valid_service_token` allow policy on each Terraform-managed hub site's Pages + Worker Access apps.

After changing Terraform, run:

```bash
cd terraform && terraform apply -var-file=environments/hub.tfvars
bash scripts/deploy-platform-admin.sh   # only if Functions/UI changed
```

**Terraform API token:** needs **Access: Service Tokens → Edit** (in addition to Access: Apps and Policies) to create the health-check service token. Without it, apply fails with `1010 auth.forbidden` on `access/service_tokens`.

## v1 features

- Site list from registry + Terraform contract
- Per-site Worker health and Access probe (server-side fetch via Access service token)
- Provisioning checklist hints
- “Add a site” runbook links

## v2

- Summary bar (site count, Terraform-managed count, health overview)
- **Check all health** + auto-check on load when service auth is configured
- Per-site status indicator (healthy / degraded / unhealthy)
- **Cloudflare dashboard deep links** (Pages, Worker, D1, Access apps)
- Copy-to-clipboard operator commands (Wrangler deploy, sync script)
- Live provisioning checklist updates from health probe results
- Direct **Access probe** link per site

## v3 — site wizard

Multi-step wizard (**Add site**, **Edit**, **Delete** on each card) dispatches GitHub Actions [`platform-site-manage.yml`](../.github/workflows/platform-site-manage.yml), which:

1. Patches `platform/sites.yaml`, `hub.tfvars.example`, `worker/wrangler.toml`, and `worker/package.json`
2. Runs `terraform validate` and registry tests
3. Opens a pull request

After the PR merges:

1. **Automated:** [`platform-site-provision.yml`](../.github/workflows/platform-site-provision.yml) runs on push to `main` (Terraform, Worker, Pages, manifest). See [platform-provision.md](./platform-provision.md) for one-time R2 + secrets setup.
2. **Manual retry:** **Provision** on the site card in platform admin.

**Deploy Worker** on a card dispatches [`platform-site-deploy.yml`](../.github/workflows/platform-site-deploy.yml) (Worker only).

### Enable automation

Set on the platform Pages project (via Terraform or dashboard):

| Variable | Purpose |
|----------|---------|
| `PLATFORM_GITHUB_TOKEN` | GitHub PAT with `contents:write` + `actions:write` |
| `PLATFORM_GITHUB_REPO` | `owner/repo` (default from Terraform: `{github_owner}/{github_repo}`) |

In `hub.tfvars` (never commit the token):

```hcl
platform_github_token = "ghp_..."
```

Then `terraform apply` and redeploy platform admin if needed.

Production is **protected** — cannot be deleted from the wizard. Import existing stacks with `scripts/terraform-import-hub-site.sh`.

## v4 — automated provisioning

See [platform-provision.md](./platform-provision.md) for remote Terraform state, GitHub secrets, and the full CI pipeline.

## Related

- [platform-terraform.md](./platform-terraform.md) — site provisioning
- [platform/sites.yaml](../platform/sites.yaml) — manifest
