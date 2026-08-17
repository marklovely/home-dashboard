#!/usr/bin/env bash
# Build and deploy the dashboard to a Cloudflare Pages project (production branch).
# Use when Terraform created the project but nothing has deployed from main yet.
#
# Usage: bash scripts/deploy-cloudflare-pages-site.sh sandbox
# Requires: npx wrangler login (unset CLOUDFLARE_API_TOKEN first)
set -euo pipefail

SITE_ID="${1:-}"
if [[ -z "$SITE_ID" ]]; then
  echo "Usage: bash scripts/deploy-cloudflare-pages-site.sh <site_id>" >&2
  echo "Example: bash scripts/deploy-cloudflare-pages-site.sh sandbox" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAGES_PROJECT="home-dashboard-${SITE_ID}"
BRANCH="${PAGES_BRANCH:-main}"

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Note: unset CLOUDFLARE_API_TOKEN so wrangler uses OAuth (recommended for pages deploy)." >&2
fi

# Read hub_environment from terraform output when available
HUB_ENV="$SITE_ID"
if [[ -d "$ROOT/terraform/.terraform" ]] || [[ -f "$ROOT/terraform/.terraform.lock.hcl" ]]; then
  HUB_ENV="$(cd "$ROOT/terraform" && terraform output -json sites 2>/dev/null | node -e "
    const sites = JSON.parse(require('fs').readFileSync(0,'utf8'));
    const site = sites[process.argv[1]];
    if (site?.hub_environment) console.log(site.hub_environment);
    else console.log(process.argv[1]);
  " "$SITE_ID" 2>/dev/null || echo "$SITE_ID")"
fi

echo "==> Building for Pages project: $PAGES_PROJECT (hub_environment=$HUB_ENV)"
cd "$ROOT"
npm ci
VITE_HUB_ENVIRONMENT="$HUB_ENV" VITE_DEPLOYMENT_MODE=home npm run build

echo "==> Deploying dist/ to Cloudflare Pages (branch=$BRANCH)"
npx wrangler pages deploy dist \
  --project-name="$PAGES_PROJECT" \
  --branch="$BRANCH" \
  --commit-dirty=true

echo ""
echo "Done. Open the custom domain or https://${PAGES_PROJECT}.pages.dev"
echo "Worker must also be deployed: cd worker && npm run deploy:${SITE_ID}"
