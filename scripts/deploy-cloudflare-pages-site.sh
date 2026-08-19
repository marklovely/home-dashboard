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
  echo "Using CLOUDFLARE_API_TOKEN for Pages deploy."
fi

HUB_ENV="$SITE_ID"
if [[ -f "$ROOT/terraform/.terraform.lock.hcl" ]]; then
  HUB_ENV="$(node "$ROOT/scripts/lib/terraform-site-output.mjs" hub-environment "$SITE_ID" 2>/dev/null || echo "$SITE_ID")"
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

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" && -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo ""
  echo "==> Attaching HUB_API Pages binding (required for /api on this site)"
  node "$ROOT/scripts/attach-hub-api-pages-binding.mjs" "$SITE_ID"
else
  echo ""
  echo "NOTE: HUB_API binding was NOT attached (set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)."
  echo "      Without it, /api/* on the hub will not reach the Worker. Run:"
  echo "        node scripts/attach-hub-api-pages-binding.mjs $SITE_ID"
fi

echo ""
echo "Done. Open the custom domain or https://${PAGES_PROJECT}.pages.dev"
echo "Verify: https://${SITE_ID}.lovely-home.co.uk/api/access-probe (usesHubApiBinding should be true)"
