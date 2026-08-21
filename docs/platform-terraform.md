# Platform Terraform — Lovely Home Hub

Provisions **isolated hub sites** on Cloudflare (D1, R2, Pages, DNS, Zero Trust Access). Worker code deploy and D1 migrations stay in Wrangler/CI.

Site registry: [`platform/sites.yaml`](../platform/sites.yaml).

## What Terraform manages

| Resource | Per site |
|----------|----------|
| D1 | `lovely-home-appliance-manuals-{site}` |
| R2 | guides + media buckets |
| Pages | `home-dashboard-{site}` + env vars + `HUB_API` binding |
| DNS | `{hostname}` CNAME → Pages project **`subdomain`** (not `{project_name}.pages.dev` — legacy production uses `home-dashboard-a11.pages.dev`) |
| Access | Pages hostname + Worker `*.workers.dev` apps + email policies |

**Production** can be imported into Terraform (legacy names: `home-dashboard`, `lovely-home-hub-api`). Use `scripts/terraform-plan-production-safe.sh` before apply. **Test** and **sandbox** are Terraform-managed.

## Prerequisites

1. **Cloudflare API token** (not the Global API Key, not Wrangler OAuth). Create at [Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens).

   **Recommended:** Custom token → **Edit Cloudflare Workers** template, then ensure these permissions:

   | Scope | Permission |
   |-------|------------|
   | Account → D1 | Edit |
   | Account → Workers R2 Storage | Edit |
   | Account → Cloudflare Pages | Edit |
   | Account → Access: Apps and Policies | Edit |
   | Account → Access: Service Tokens | Edit |
   | Account → Workers Scripts | Edit |
   | Account → Account Settings | Read |
   | Zone → `lovely-home.co.uk` → DNS | Edit |
   | Zone → `lovely-home.co.uk` → Workers Routes | Edit |
   | Zone → `lovely-home.co.uk` → Zone | Read |

   **Account resources:** include your account. **Zone resources:** include `lovely-home.co.uk`.

   Verify before apply:

   ```bash
   export CLOUDFLARE_API_TOKEN="..."
   export CLOUDFLARE_ACCOUNT_ID="your-account-id"
   export CLOUDFLARE_ZONE_ID="your-zone-id"
   bash scripts/verify-cloudflare-api-token.sh
   ```

   Terraform reads **`CLOUDFLARE_API_TOKEN`** automatically (do not put the token in `*.tfvars` unless you use `TF_VAR_` — the provider block is intentionally empty).

2. GitHub account linked to Cloudflare Pages (one-time dashboard step).
3. [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.5.
4. Wrangler logged in for **deploy + secrets** (`npx wrangler login`).

   **Terraform token ≠ Wrangler token.** After `terraform apply`, run Worker commands with OAuth, not the Terraform API token:

   ```bash
   unset CLOUDFLARE_API_TOKEN   # otherwise wrangler reuses it and secret put fails
   cd worker
   npx wrangler login           # browser OAuth — one-time until session expires
   npm run deploy:sandbox
   npx wrangler secret put HUB_PROXY_SECRET --env sandbox
   ```

   Alternatively, add **Account → Workers Scripts → Edit** to your API token and keep `CLOUDFLARE_API_TOKEN` set — that permission covers deploy and `wrangler secret put`. OAuth is simpler for local setup.

## First-time sandbox

```bash
# 1. Configure vars (attach_hub_api_binding = false until Worker exists)
cp terraform/environments/sandbox.tfvars.example terraform/environments/sandbox.tfvars
# Edit with account ID, zone ID, real owner emails

export CLOUDFLARE_API_TOKEN="..."
cd terraform
terraform init
terraform plan -var-file=environments/sandbox.tfvars
terraform apply -var-file=environments/sandbox.tfvars

# 2. Sync D1 id into wrangler + deploy Worker (OAuth — not terraform token)
cd ..
unset CLOUDFLARE_API_TOKEN
node scripts/sync-wrangler-from-terraform.mjs sandbox
cd worker
npx wrangler login
npm run d1:migrate:sandbox
npm run deploy:sandbox
bash ../scripts/post-terraform-site-setup.sh sandbox

# 3. Enable HUB_API binding in Terraform (Worker must exist first)
#    In sandbox.tfvars set attach_hub_api_binding = true on the sandbox site (default), then:
cd ../terraform
terraform apply -var-file=environments/sandbox.tfvars

# 4. Deploy Pages frontend
bash ../scripts/deploy-cloudflare-pages-site.sh sandbox
# Open https://sandbox.lovely-home.co.uk/api/access-probe while logged in
```

## Pages not deploying (“No production deployment yet”)

Terraform creates the **Pages project** and env vars; it does **not** upload a build. Git-connected projects use:

| Setting | Value | Effect |
|---------|-------|--------|
| `production_branch` | `main` | **`main`** gets Production deployments |
| Hub `preview_deployment_setting` | `none` in Terraform | Avoids Cloudflare **8000022** when PATCHing Pages with HUB_API bindings |
| `pages_preview_deployments_enabled` | `true` (platform admin only) | Platform admin project gets preview builds via Terraform |
| Hub branch previews | `node scripts/enable-hub-pages-previews.mjs` | Run after apply when you want hub site preview URLs |

Preview URLs look like `https://<branch>.<project>.pages.dev`. **Platform admin** previews are Terraform-managed; **hub sites** (demo, test, sandbox) use the enable script because the Terraform provider cannot safely PATCH preview settings and HUB_API service bindings together.

**Access:** Custom domains (`platform.lovely-home.co.uk`, `demo.lovely-home.co.uk`) have Terraform-managed Access apps. Preview `*.pages.dev` hostnames may need a separate Access application (wildcard or per-branch) — see [cloudflare-access-runbook.md](./cloudflare-access-runbook.md).

If preview rows show **“No deployment available”**, either previews are disabled (`pages_preview_deployments_enabled = false`) or Terraform has not been applied since enabling them.

If apply fails on existing sites with **`Invalid Service name ()` (8000022)** when updating Pages, hub site `pages.tf` keeps `preview_deployment_setting = "none"` in Terraform — use `node scripts/enable-hub-pages-previews.mjs` after apply instead.

**First production deploy** (when the project has never built):

```bash
unset CLOUDFLARE_API_TOKEN
npx wrangler login
bash scripts/deploy-cloudflare-pages-site.sh sandbox
```

**Option B — dashboard:** Workers & Pages → **home-dashboard-sandbox** → **Create deployment** → branch **`main`**.

**Option C — merge PR to `main`:** triggers Production on sandbox (and your existing production Pages project if it also tracks `main`).

After the first Pages deploy, ensure the **Worker** is up (`npm run deploy:sandbox` + secrets from `post-terraform-site-setup.sh`).

**`access_team_domain` in tfvars** must match **Zero Trust → Settings** (`https://<team>.cloudflareaccess.com`), not the Workers `*.workers.dev` subdomain. Wrong value causes “Unable to find your Access organization” on login.

## HUB_API Pages binding

Terraform manages Pages **env vars** on create; **`lifecycle { ignore_changes = [deployment_configs] }`** stops later applies from PATCHing deployment configs (the provider returns **8000022** or **unknown environment** on service bindings).

**HUB_API** is attached with:

```bash
bash scripts/deploy-cloudflare-pages-site.sh <site_id>
```

(or `node scripts/attach-hub-api-pages-binding.mjs <site_id>` then redeploy Pages — the deploy script does both).

CI runs this after Worker deploy. Local full applies skip deployment config changes — run the deploy script after Worker deploy if health checks show `HUB_API binding no`.

| Site block flag | Meaning |
|-----------------|--------|
| `attach_hub_api_binding = true` in `sites.yaml` | Site is fully provisioned; health checks expect HUB_API |
| `attach_hub_api_binding = false` | Pre-worker / first apply only in CI generated tfvars |

**Production** (`home-dashboard`) is not in this Terraform stack — configure **HUB_API → `lovely-home-hub-api`** in the dashboard as today.

## tfvars hygiene

Use real values in `hub.tfvars` (never commit it):

- **`hub.tfvars` must list every site with `terraform: true` in `platform/sites.yaml`.** If you add a site via the platform wizard but omit it from local `hub.tfvars`, the next `terraform apply -var-file=environments/hub.tfvars` **destroys** that site's Cloudflare resources. Before any local apply, run:
  ```bash
  node scripts/validate-local-hub-tfvars-sites.mjs
  ```
  Or generate tfvars from the registry (same as CI): `node scripts/generate-hub-tfvars.mjs` with the required env vars, then apply using `hub.generated.tfvars`.
- **`owner_emails`** / **`sitter_emails`** — must match who should pass Access. Placeholder emails in tfvars will overwrite Access policies on apply.
- **`hub_proxy_secret`** — required when importing a site; preserves existing Pages/Worker proxy secret.
- **`access_team_domain`** — Zero Trust team slug (`lovely-home`), not the Workers subdomain.

### Add a tester (sandbox / test only)

Terraform manages Access policies — **do not** add tester emails in the Cloudflare dashboard; the next apply will overwrite manual edits.

1. Add the email under `sites.<site_id>.tester_emails` in local `hub.tfvars` (not global `owner_emails`, or they will get production too).
2. Validate site list: `node scripts/validate-local-hub-tfvars-sites.mjs`
3. Apply: `cd terraform && terraform apply -var-file=environments/hub.tfvars`
4. Sync Worker owner list: `node scripts/set-worker-secrets-from-terraform.mjs <site_id>` (e.g. `sandbox`, `test`)

The tester must sign in with that **exact** email address for OTP. Without step 4 they may pass Access but get 403 on owner API routes (calendar, backup, …).

## Pages preview Access ("invalid redirect URL")

PR preview URLs look like `https://<hash>.home-dashboard-a11.pages.dev`. Cloudflare Access must allow that hostname for OAuth to succeed.

Terraform-managed hub and platform Pages Access apps include three destinations (same `CF_ACCESS_AUD_PAGES` everywhere):

- Custom domain (e.g. `dashboard.lovely-home.co.uk`)
- Default Pages hostname (e.g. `home-dashboard-a11.pages.dev`)
- Preview wildcard (e.g. `*.home-dashboard-a11.pages.dev`)

After enabling preview builds (PR #84), run **`terraform apply`** once so Access destinations update. Preview env vars already copy production `CF_ACCESS_AUD_PAGES` via `enable-hub-pages-previews.mjs` — the AUD stays the same; the app must cover preview hostnames.

If login still fails:

1. **Zero Trust → Access → Applications** — remove duplicate manual apps for the same `*.pages.dev` host (keep the Terraform app `Lovely Home — {site} Pages`).
2. **Pages → project → Settings** — if "Enable access policy" created extra auto apps, follow [Cloudflare Pages known issues](https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain) so only the Terraform apps apply.
3. Redeploy the preview from the PR checks tab.

## Outputs contract

```bash
terraform output -json sites
```

Each site exposes `d1_database_id`, `access_pages_aud`, `access_worker_aud`, `access_aud_combined`, `worker_api_origin`, etc. — intended for scripts and a future platform admin UI.

## Secrets (not in Terraform state for Worker)

`post-terraform-site-setup.sh` prints Wrangler commands for:

- `HUB_PROXY_SECRET` (from `terraform output -json hub_proxy_secrets`)
- `CF_ACCESS_AUD` (`access_aud_combined` from site contract)
- `CF_ACCESS_TEAM_DOMAIN`, `OWNER_EMAILS`, dummy `PRIVATE_*` for vanilla sites

Pages receives `HUB_PROXY_SECRET` and `CF_ACCESS_AUD_PAGES` from Terraform.

## Platform admin (operator dashboard)

Separate from hub sites — Mark-only UI at `platform.lovely-home.co.uk` (optional):

```hcl
platform_operator_emails = ["you@example.com"]
platform_admin = {
  enabled  = true
  hostname = "platform.lovely-home.co.uk"
}
```

See [platform-admin.md](./platform-admin.md). Output: `terraform output -json platform_admin`.

## Adding another site

1. Add entry to `platform/sites.yaml` with `terraform: true`.
2. Add matching block to `terraform/environments/*.tfvars`.
3. Add `[env.{site_id}]` to `worker/wrangler.toml` (or run sync script after first apply).
4. `terraform apply` → sync wrangler → migrate → deploy.

## Destroy a site

**Automated (v5):** delete via the platform admin wizard → merge the PR → [`platform-site-deprovision.yml`](../.github/workflows/platform-site-deprovision.yml) runs on push to `main`. See [platform-provision.md](./platform-provision.md#v5--automated-deprovision).

**Manual (local):**

```bash
cd terraform
terraform destroy -var-file=environments/sandbox.tfvars \
  -target='module.hub_site["sandbox"]'
```

Or use `node scripts/deprovision-hub-site.mjs <site_id>` after removing the site from `platform/sites.yaml`.

**Warning:** destroys D1 data and R2 buckets for that site.

## Importing existing test/production

Use when a site was provisioned manually (see [cloudflare-test-environment.md](./cloudflare-test-environment.md)) and you want Terraform to manage it without recreating D1/R2/Pages/Access/DNS.

**Production:** import when ready — see [Import production](#import-production) below. Until import completes, keep `terraform: false` in `platform/sites.yaml`.

### Import test (step-by-step)

1. **Merge site into tfvars** — add `test` with `terraform = true` to your var-file (see [`terraform/environments/hub.tfvars.example`](../terraform/environments/hub.tfvars.example)). Keep `sandbox` in the same file if it is already in state.

2. **Preserve `HUB_PROXY_SECRET`** — copy the existing value from the test Pages project and test Worker. Set `hub_proxy_secret` on the `test` site block in tfvars (required so Terraform does not rotate secrets on apply).

3. **Remove Pages secret for import** — Cloudflare **cannot import** a Pages project while `HUB_PROXY_SECRET` exists as a **secret** env var in the dashboard. Delete it from **home-dashboard-test → Settings → Environment variables → Production** only. Terraform restores it on the next apply from `hub_proxy_secret`.

4. **Run the import script** (from repo root):

   ```bash
   export CLOUDFLARE_API_TOKEN="..."
   cd terraform && terraform init
   bash ../scripts/terraform-import-hub-site.sh test -var-file=environments/hub.tfvars
   ```

   The script imports D1, R2×2, Access apps, Pages project, custom domain, and DNS CNAME into `module.hub_site["test"]`.

5. **Review plan** — expect some drift on Access app display names and Pages settings. Do **not** apply if the plan would replace D1 or R2 buckets.

   ```bash
   terraform plan -var-file=environments/hub.tfvars
   ```

6. **Apply when safe** — reconciles Pages env vars (including restored `HUB_PROXY_SECRET`), DNS comment, Access policies, and **HUB_API** binding.

7. **Post-import** — set `terraform: true` for `test` in [`platform/sites.yaml`](../platform/sites.yaml). With `attach_hub_api_binding = true` (default), `/api/access-probe` should show `usesHubApiBinding: true` after apply.

Worker deploy, D1 migrations, and Worker secrets remain Wrangler/CI — unchanged from the manual test stack.

### Import production (step-by-step)

Production uses **legacy Cloudflare names** (no `-production` suffix):

| Resource | Name |
|----------|------|
| Pages | `home-dashboard` |
| Worker | `lovely-home-hub-api` |
| D1 | `lovely-home-appliance-manuals` |
| R2 guides | `lovely-home-appliance-guides` |
| R2 media | `lovely-home-guide-media` |

1. **Add production to tfvars** with `terraform = true` and **`hub_proxy_secret`** (copy from Pages `home-dashboard` and production Worker — must match).

2. **Remove Pages secret for import** — delete `HUB_PROXY_SECRET` from **home-dashboard → Settings → Environment variables → Production** (Terraform restores it on apply).

3. **Import** (same script as test):

   ```bash
   export CLOUDFLARE_API_TOKEN="..."
   cd terraform && terraform init
   bash ../scripts/terraform-import-hub-site.sh production -var-file=environments/hub.tfvars
   ```

4. **Plan carefully** — expect drift on Access app display names (`Lovely Home — Pages production` vs module name). **Do not apply** if the plan replaces D1, R2, or destroys resources.

   ```bash
   terraform plan -var-file=environments/hub.tfvars
   ```

5. **Apply when safe** — reconciles env vars, HUB_API binding, and platform health Access policy.

   If apply fails on `cloudflare_pages_project` with **`Invalid Service name ()` (8000022)** or **unknown environment** on service bindings, hub Pages use `lifecycle { ignore_changes = [deployment_configs] }` — run `node scripts/attach-hub-api-pages-binding.mjs <site_id>` after Worker deploy instead.

   Optional guard before apply:

   ```bash
   bash ../scripts/terraform-plan-production-safe.sh -var-file=environments/hub.tfvars
   ```

6. **Post-import** — set `terraform: true` in [`platform/sites.yaml`](../platform/sites.yaml) and run `npm run platform:manifest`.

Production Worker deploy stays `cd worker && npm run deploy` (default env, not `--env production`).

**DNS note:** Legacy production Pages project name is `home-dashboard` but Cloudflare assigned subdomain **`home-dashboard-a11.pages.dev`**. The hub module CNAME must target `cloudflare_pages_project.dashboard.subdomain`, not `{name}.pages.dev`. Pointing at `home-dashboard.pages.dev` causes **Error 1014 (CNAME Cross-User Banned)**.

### Alternative: cf-terraforming

[`cf-terraforming`](https://github.com/cloudflare/cf-terraforming) can generate HCL and import IDs for comparison. Prefer the import script above when using this repo’s `hub_environment` module.

## Related

- [platform-admin.md](./platform-admin.md) — operator dashboard (Mark-only)
- [cloudflare-test-environment.md](./cloudflare-test-environment.md) — manual test stack (pre-Terraform)
- [cloudflare-pages-configuration.md](./cloudflare-pages-configuration.md) — Pages proxy pattern
