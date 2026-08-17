# Platform Terraform — Lovely Home Hub

Provisions **isolated hub sites** on Cloudflare (D1, R2, Pages, DNS, Zero Trust Access). Worker code deploy and D1 migrations stay in Wrangler/CI.

Site registry: [`platform/sites.yaml`](../platform/sites.yaml).

## What Terraform manages

| Resource | Per site |
|----------|----------|
| D1 | `lovely-home-appliance-manuals-{site}` |
| R2 | guides + media buckets |
| Pages | `home-dashboard-{site}` + env vars + `HUB_API` binding |
| DNS | `{hostname}` CNAME → Pages |
| Access | Pages hostname + Worker `*.workers.dev` apps + email policies |

**Production** remains `terraform: false` in the manifest until you import it deliberately. **Test** and **sandbox** are Terraform-managed.

## Prerequisites

1. **Cloudflare API token** (not the Global API Key, not Wrangler OAuth). Create at [Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens).

   **Recommended:** Custom token → **Edit Cloudflare Workers** template, then ensure these permissions:

   | Scope | Permission |
   |-------|------------|
   | Account → D1 | Edit |
   | Account → Workers R2 Storage | Edit |
   | Account → Cloudflare Pages | Edit |
   | Account → Access: Apps and Policies | Edit |
   | Account → Account Settings | Read |
   | Zone → `lovely-home.co.uk` → DNS | Edit |
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

   Alternatively, add **Account → Workers Scripts → Edit** and **Workers Secrets → Edit** to your API token and keep `CLOUDFLARE_API_TOKEN` set — OAuth is simpler for local setup.

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

Terraform creates the **Pages project** and env vars; it does **not** upload a build. Git-connected sandbox projects are configured with:

| Setting | Value | Effect |
|---------|-------|--------|
| `production_branch` | `main` | Only **`main`** gets a Production deployment |
| `preview_deployment_setting` | `none` | Feature/PR branches do **not** build |

So commits on `feature/platform-terraform-sandbox` appear in the dashboard as Preview rows with **“No deployment available”** — that is expected until something deploys from **`main`**.

**Option A — deploy now (no merge):**

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

Terraform manages the **HUB_API** service binding on Terraform-managed Pages projects (`HUB_API` → `lovely-home-hub-api-{site}`). This prevents `terraform apply` from clearing dashboard-only bindings.

| Site block flag | When |
|-----------------|------|
| `attach_hub_api_binding = true` (default) | Worker is deployed — normal ops for test/sandbox |
| `attach_hub_api_binding = false` | First `terraform apply` on a **new** site before the Worker exists; deploy Worker, set `true`, apply again |

**Production** (`home-dashboard`) is not in this Terraform stack — configure **HUB_API → `lovely-home-hub-api`** in the dashboard as today.

## tfvars hygiene

Use real values in `hub.tfvars` (never commit it):

- **`owner_emails`** / **`sitter_emails`** — must match who should pass Access. Placeholder emails in tfvars will overwrite Access policies on apply.
- **`hub_proxy_secret`** — required when importing a site; preserves existing Pages/Worker proxy secret.
- **`access_team_domain`** — Zero Trust team slug (`lovely-home`), not the Workers subdomain.

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

## Adding another site

1. Add entry to `platform/sites.yaml` with `terraform: true`.
2. Add matching block to `terraform/environments/*.tfvars`.
3. Add `[env.{site_id}]` to `worker/wrangler.toml` (or run sync script after first apply).
4. `terraform apply` → sync wrangler → migrate → deploy.

## Destroy a site

```bash
cd terraform
terraform destroy -var-file=environments/sandbox.tfvars \
  -target='module.hub_site["sandbox"]'
```

**Warning:** destroys D1 data and R2 buckets for that site.

## Importing existing test/production

Use when a site was provisioned manually (see [cloudflare-test-environment.md](./cloudflare-test-environment.md)) and you want Terraform to manage it without recreating D1/R2/Pages/Access/DNS.

**Production:** keep `terraform: false` in `platform/sites.yaml` until you are confident in destroy safeguards.

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

### Alternative: cf-terraforming

[`cf-terraforming`](https://github.com/cloudflare/cf-terraforming) can generate HCL and import IDs for comparison. Prefer the import script above when using this repo’s `hub_environment` module.

## Related

- [cloudflare-test-environment.md](./cloudflare-test-environment.md) — manual test stack (pre-Terraform)
- [cloudflare-pages-configuration.md](./cloudflare-pages-configuration.md) — Pages proxy pattern
