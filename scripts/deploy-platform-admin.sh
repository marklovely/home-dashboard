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

echo "==> Building platform admin"
cd "$ROOT"
npm ci
npm run build:platform

echo "==> Deploying dist-platform/ to $PAGES_PROJECT (branch=$BRANCH)"
npx wrangler pages deploy dist-platform \
  --project-name="$PAGES_PROJECT" \
  --branch="$BRANCH" \
  --commit-dirty=true \
  --functions="platform-admin/functions"

echo ""
echo "Done. Open https://platform.lovely-home.co.uk (after terraform apply + DNS) or Pages dashboard URL."
