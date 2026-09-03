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
eval "$(bash "$ROOT/scripts/lib/hub-site-resource-names.sh" "$SITE_ID")"
PAGES_PROJECT="$PAGES_NAME"
BRANCH="${PAGES_BRANCH:-main}"
if [[ -x "$ROOT/worker/node_modules/.bin/wrangler" ]]; then
  WRANGLER=("$ROOT/worker/node_modules/.bin/wrangler")
else
  WRANGLER=(npx wrangler)
fi

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

echo "==> Staging hub-only Pages Functions (no platform/stripe/public routes)"
# Wrangler 4 looks for ./functions in cwd. --functions-directory was removed
# in 4.128 and fails provision with "Unknown arguments".
HUB_FUNCTIONS_CWD="$ROOT/dist-hub-functions"
rm -rf "$HUB_FUNCTIONS_CWD"
node "$ROOT/scripts/prune-hub-pages-functions.mjs" --out "$HUB_FUNCTIONS_CWD/functions"

echo "==> Deploying dist/ to Cloudflare Pages (branch=$BRANCH)"
pages_deploy() {
  (
    cd "$HUB_FUNCTIONS_CWD"
    "${WRANGLER[@]}" pages deploy "$ROOT/dist" \
      --project-name="$PAGES_PROJECT" \
      --branch="$BRANCH" \
      --commit-dirty=true
  )
}

pages_deploy

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" && -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo ""
  echo "==> Attaching HUB_API Pages binding (required for /api on this site)"
  node "$ROOT/scripts/attach-hub-api-pages-binding.mjs" "$SITE_ID"
  echo ""
  echo "==> Redeploying Pages so the active deployment picks up HUB_API"
  pages_deploy
else
  echo ""
  echo "NOTE: HUB_API binding was NOT attached (set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)."
  echo "      Without it, /api/* on the hub will not reach the Worker. Run:"
  echo "        node scripts/attach-hub-api-pages-binding.mjs $SITE_ID"
  echo "        bash scripts/deploy-cloudflare-pages-site.sh $SITE_ID"
fi

echo ""
echo "Done. Open the custom domain or https://${PAGES_PROJECT}.pages.dev"
echo "Verify: https://${SITE_ID}.lovely-home.co.uk/api/access-probe (usesHubApiBinding should be true)"
