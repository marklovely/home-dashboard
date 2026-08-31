#!/usr/bin/env bash
# Build and deploy the platform operator dashboard to Cloudflare Pages.
# Usage: bash scripts/deploy-platform-admin.sh
# Requires: npx wrangler login (unset CLOUDFLARE_API_TOKEN first)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAGES_PROJECT="${PLATFORM_PAGES_PROJECT:-home-dashboard-platform}"
BRANCH="${PAGES_BRANCH:-main}"

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Note: unset CLOUDFLARE_API_TOKEN so wrangler uses OAuth (recommended for pages deploy)." >&2
fi

cd "$ROOT"
node scripts/check-platform-registry-sync.mjs

echo "==> Building platform admin"
npm ci
npm run build:platform

echo "==> Staging Pages Functions (shared repo functions + platform API route)"
rm -rf dist-platform/functions
mkdir -p dist-platform/functions/lib dist-platform/functions/api/platform dist-platform/functions/api/stripe dist-platform/functions/api/public
cp functions/_middleware.js dist-platform/functions/
cp functions/lib/emailLists.js dist-platform/functions/lib/
cp functions/lib/accessTeamDomain.js dist-platform/functions/lib/
cp functions/api/middlewareAccess.js dist-platform/functions/api/
cp functions/api/accessIdentity.js dist-platform/functions/api/
cp functions/api/accessJwtExtract.js dist-platform/functions/api/
cp functions/api/platform/[[path]].js dist-platform/functions/api/platform/
cp functions/api/platform/*.js dist-platform/functions/api/platform/
cp functions/api/stripe/[[path]].js dist-platform/functions/api/stripe/
cp functions/api/public/[[path]].js dist-platform/functions/api/public/

echo "==> Deploying dist-platform/ to $PAGES_PROJECT (branch=$BRANCH)"
npx wrangler pages deploy dist-platform \
  --project-name="$PAGES_PROJECT" \
  --branch="$BRANCH" \
  --commit-dirty=true

echo ""
echo "Done. Open https://platform.lovely-home.co.uk"
