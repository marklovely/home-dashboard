#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v wrangler >/dev/null 2>&1; then
  WRANGLER=(wrangler)
else
  WRANGLER=(npx wrangler)
fi

PROJECT_NAME="lovely-home"
PRODUCTION_BRANCH="main"

if ! "${WRANGLER[@]}" pages project list 2>/dev/null | grep -qE "│ ${PROJECT_NAME}[[:space:]]"; then
  echo "==> Creating Pages project: ${PROJECT_NAME} (production branch: ${PRODUCTION_BRANCH})"
  "${WRANGLER[@]}" pages project create "${PROJECT_NAME}" --production-branch "${PRODUCTION_BRANCH}"
fi

echo "==> Deploying ./website to ${PROJECT_NAME} (branch=${PRODUCTION_BRANCH})"
"${WRANGLER[@]}" pages deploy ./website --project-name "${PROJECT_NAME}" --branch "${PRODUCTION_BRANCH}" --commit-dirty=true

echo
echo "Home:     https://lovely-home.co.uk/"
echo "Gallery:  https://lovely-home.co.uk/app.html"
echo "Support:  https://lovely-home.co.uk/support.html"
echo "Privacy:  https://lovely-home.co.uk/privacy.html"
echo
echo "If the custom domain is not attached yet, add lovely-home.co.uk in Cloudflare Pages → lovely-home → Custom domains."
