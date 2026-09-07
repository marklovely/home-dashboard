#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -x "$ROOT/worker/node_modules/.bin/wrangler" ]]; then
  WRANGLER=("$ROOT/worker/node_modules/.bin/wrangler")
elif command -v wrangler >/dev/null 2>&1; then
  WRANGLER=(wrangler)
else
  WRANGLER=(npx wrangler)
fi

PROJECT_NAME="lovely-hub-zone"
PRODUCTION_BRANCH="main"

if ! "${WRANGLER[@]}" pages project list 2>/dev/null | grep -qE "│ ${PROJECT_NAME}[[:space:]]"; then
  echo "==> Creating Pages project: ${PROJECT_NAME} (production branch: ${PRODUCTION_BRANCH})"
  "${WRANGLER[@]}" pages project create "${PROJECT_NAME}" --production-branch "${PRODUCTION_BRANCH}"
fi

echo "==> Deploying ./zone to ${PROJECT_NAME} (branch=${PRODUCTION_BRANCH})"
"${WRANGLER[@]}" pages deploy ./zone --project-name "${PROJECT_NAME}" --branch "${PRODUCTION_BRANCH}" --commit-dirty=true

echo
echo "Home: https://lovely-hub.com/"
echo "404:  https://lovely-hub.com/404.html"
echo
echo "If the custom domain is not attached yet, add lovely-hub.com in Cloudflare Pages → ${PROJECT_NAME} → Custom domains."
