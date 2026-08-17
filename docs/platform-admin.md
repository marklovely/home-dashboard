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

Household hub tablets use the main `src/` app. Platform admin is a **separate Pages project** (future hostname e.g. `platform.lovely-home.co.uk`) with its own Cloudflare Access app — operator email allowlist only.

## Local development

```bash
npm run platform:manifest   # merge sites.yaml + terraform output
npm run dev:platform        # API on :8791, UI on :5174
```

Open http://localhost:5174 — dev API skips Cloudflare Access (uses `PLATFORM_OPERATOR_EMAILS` default `dev@localhost`).

## Production deploy (manual until Terraform module exists)

```bash
npm run build:platform
# Deploy dist-platform/ to a dedicated Pages project with:
#   - Functions directory: platform-admin/functions
#   - Env: CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD_PAGES, PLATFORM_OPERATOR_EMAILS
npx wrangler pages deploy dist-platform --project-name home-dashboard-platform
```

Copy `platform-admin/functions/` into the deploy bundle or configure Pages **functions directory** in project settings to point at `platform-admin/functions` in the repo (monorepo root build).

### Required Pages env vars

| Variable | Purpose |
|----------|---------|
| `CF_ACCESS_TEAM_DOMAIN` | Zero Trust team slug |
| `CF_ACCESS_AUD_PAGES` | Access app AUD for platform hostname |
| `PLATFORM_OPERATOR_EMAILS` | Comma-separated operator emails (you only) |

## v1 features

- Site list from registry + Terraform contract
- Per-site Worker health and Access probe (server-side fetch)
- Provisioning checklist hints
- “Add a site” runbook links

## v2 (not yet)

- Trigger deploy / terraform via GitHub Actions
- Edit `platform/sites.yaml` from UI
- Cloudflare dashboard deep links
- Dedicated Terraform module for platform Pages project

## Related

- [platform-terraform.md](./platform-terraform.md) — site provisioning
- [platform/sites.yaml](../platform/sites.yaml) — manifest
