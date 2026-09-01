# Platform admin dashboard

Mark-only operator UI for deploying and managing Lovely Home Hub **sites** (production, test, sandbox, future tenants). Not shown to household owners or Airbnb guests.

## Architecture

| Piece | Location |
|-------|----------|
| Site registry | `platform/sites.yaml` |
| Live infra contract | `terraform output -json sites` |
| Built manifest | `platform-admin/public/platform-manifest.json` (merged from Terraform + registry; **committed** so CI builds preserve contracts when state is unavailable) |
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

Git-connected Production builds run `npm run build:platform`. The manifest is **committed** in git; CI merges registry changes with preserved contracts when Terraform state is not present. After `terraform apply`, run `npm run platform:manifest` and commit the updated manifest (or use the deploy script locally).

**Contract precedence.** When `terraform output -json sites` is readable, it wins outright: a Terraform-managed site missing from it has been destroyed, so its committed contract is dropped rather than preserved (the build logs `dropped stale contract for …`). Contracts are only carried over from the committed manifest when Terraform output is unavailable — Pages git builds — or for sites with `terraform: false`, whose contract was imported by hand. `platform-site-deprovision-reusable.yml` opens a follow-up PR with the rebuilt manifest after a teardown, so a destroyed hub stops carrying D1/R2 ids in git.

**Deploy only from a synced checkout.** A local deploy rebuilds the manifest from *your* `platform/sites.yaml`, and because Terraform state lives in R2 (unreadable from a laptop) contracts are copied from the previous manifest rather than verified. Deploying from a checkout that predates a teardown therefore republishes the dead site, complete with an `in state` badge Terraform no longer backs. `scripts/check-platform-registry-sync.mjs` runs first and refuses when `platform/sites.yaml` or `worker/wrangler.toml` differ from `origin/main`; it skips in CI, and `PLATFORM_DEPLOY_ALLOW_STALE=1` overrides it.

### Pages env vars (Terraform-managed)

| Variable | Purpose |
|----------|---------|
| `CF_ACCESS_TEAM_DOMAIN` | Zero Trust team slug |
| `CF_ACCESS_AUD_PAGES` | Access app AUD for platform hostname |
| `PLATFORM_OPERATOR_EMAILS` | Comma-separated operator emails |
| `PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID` | Access service token client ID (Terraform) |
| `PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET` | Access service token secret (Terraform) |
| `PLATFORM_CF_API_TOKEN` | Optional — Cloudflare API token for D1/R2 usage, Pages preview toggles, and marketing OTP guests (Terraform `platform_cf_api_token`). Needs **Access: Apps and Policies Edit** for the marketing list |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID (Terraform) |
| `MARKETING_SITE_ORIGIN` | Marketing site origin (default `https://lovely-home.co.uk`) |
| `MARKETING_ACCESS_APP_ID` | Access application id for the pre-launch marketing gate (set when `marketing_site_access_protected` is true) |

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
- **Check all usage** / per-site **Check usage** — D1 database size and R2 bucket usage vs Cloudflare free-tier limits (10 GB R2, 5 GB D1 per account)

Set `PLATFORM_CF_API_TOKEN` (Account Read, D1 Read, R2 Read, Pages Edit, **Access: Apps and Policies Edit**) and `CLOUDFLARE_ACCOUNT_ID` on the platform Pages project (`platform_cf_api_token` in Terraform). Usage is fetched server-side via the Cloudflare API when you click Check usage. The same token updates the marketing-site OTP list.

## Marketing site OTP list

While `marketing_site_access_protected = true`, **Marketing site access** on the dashboard lists who can OTP into `lovely-home.co.uk`.

- **Operators** (`platform_operator_emails`) always stay on that list and cannot be removed here. They also reach this dashboard.
- **Guests** are extra emails you add on the panel. They can open the marketing site only.

Do not add a previewer to `platform_operator_emails` unless they should also open `platform.lovely-home.co.uk`.

Terraform ignores guest drift on the marketing Access app (`lifecycle.ignore_changes = [policies]`), so a later apply does not wipe emails added here. Operator-list changes in tfvars are re-applied the next time you add or remove a guest from the dashboard.

If the panel shows a Cloudflare 403, update `platform_cf_api_token` with **Access: Apps and Policies Edit** and re-apply.

## v3 — site wizard

Multi-step wizard (**Add site**, **Edit**, **Delete** on each card) dispatches GitHub Actions [`platform-site-manage.yml`](../.github/workflows/platform-site-manage.yml), which:

1. Patches `platform/sites.yaml`, `hub.tfvars.example`, `worker/wrangler.toml`, and `worker/package.json`
2. Runs `terraform validate` and registry tests
3. Opens a pull request

**New customer hubs** default to `{site-id}.lovely-hub.com` with `zone_name: lovely-hub.com` in the registry. Internal stacks (demo, sandbox, test) can use **Internal platform site** in step 1 to target `*.lovely-home.co.uk` instead.

After the PR merges:

1. **Automated:** [`platform-site-provision.yml`](../.github/workflows/platform-site-provision.yml) runs on push to `main` (Terraform, Worker, Pages, manifest). See [platform-provision.md](./platform-provision.md) for one-time R2 + secrets setup.
2. **Manual retry:** **Provision** on the site card in platform admin.

**Deploy Worker** on a card dispatches [`platform-site-deploy.yml`](../.github/workflows/platform-site-deploy.yml) (Worker only).

### Enable automation

Set on the platform Pages project (via Terraform or dashboard):

| Variable | Purpose |
|----------|---------|
| `PLATFORM_GITHUB_TOKEN` | GitHub PAT with `contents:write`, `pull_requests:write`, and `actions:write` |

Set this in **two places** with the same PAT value:

1. **Cloudflare Pages** (platform admin) — env var so the wizard can dispatch workflows.
2. **GitHub → Settings → Secrets and variables → Actions** — repo secret so [`platform-site-manage.yml`](../.github/workflows/platform-site-manage.yml) can open PRs. The default `GITHUB_TOKEN` cannot create PRs unless you also enable **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests** (PAT is simpler).

| `PLATFORM_GITHUB_REPO` | `owner/repo` (default from Terraform: `{github_owner}/{github_repo}`) |

In `hub.tfvars` (never commit the token):

```hcl
platform_github_token = "ghp_..."
```

Then `terraform apply` and redeploy platform admin if needed.

### Auto-merge site PRs

Wizard PRs on `platform/site-*` branches are queued for **auto-merge (squash)** when required checks pass. If any check fails, the PR stays open.

[`platform-site-pr-automerge.yml`](../.github/workflows/platform-site-pr-automerge.yml) enables auto-merge when the PR opens (with retries while GitHub registers check runs). It runs on `pull_request_target` (workflow from `main` only) for:

- Wizard PRs: `platform/site-*` branch + Platform Admin body marker
- Provision follow-up PRs: `platform/provision-*` branch + Platform site provision body marker

Auto-merge is enabled **before** CI finishes; GitHub merges only after required checks pass.

**Required one-time repo settings:**

1. **Settings → General → Pull Requests → Allow auto-merge**
2. **Settings → Branches → Branch protection rule for `main`:**
   - **Require status checks to pass before merging**
   - Required checks: **`test`** (CI) and **`validate`** (Terraform validate)
   - GitHub's auto-merge API does not work without branch protection and at least one required check

If branch protection requires approving reviews, auto-merge waits until someone approves (or add a ruleset exception for `platform/site-*` branches).

Production is **protected** — cannot be deleted from the wizard. Import existing stacks with `scripts/terraform-import-hub-site.sh`.

## v4 — automated provisioning

See [platform-provision.md](./platform-provision.md) for remote Terraform state, GitHub secrets, and the full CI pipeline.

## v5 — automated deprovision

**Delete** in the wizard opens a PR that removes the site from the registry. After merge, [`platform-site-deprovision.yml`](../.github/workflows/platform-site-deprovision.yml) deletes the Worker, runs `terraform destroy` for that site's module (D1, R2, Pages, Access, DNS), refreshes the platform manifest, prunes local `hub.tfvars` when deprovision runs on your machine, and removes the site from `HUB_PROXY_SECRETS_JSON` in GitHub Actions when configured.

See [platform-provision.md](./platform-provision.md#v5--automated-deprovision).

## Related

- [platform-terraform.md](./platform-terraform.md) — site provisioning
- [platform/sites.yaml](../platform/sites.yaml) — manifest
- [website/README.md](../website/README.md) — marketing site Access gate
