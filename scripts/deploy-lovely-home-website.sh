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

# website/ ships as-is. Rebuild the QR bundle when Vite/Rollup can run; otherwise
# keep the committed file. npm often omits Rollup's optional native binary.
node scripts/ensure-website-qr.mjs

if ! "${WRANGLER[@]}" pages project list 2>/dev/null | grep -qE "│ ${PROJECT_NAME}[[:space:]]"; then
  echo "==> Creating Pages project: ${PROJECT_NAME} (production branch: ${PRODUCTION_BRANCH})"
  "${WRANGLER[@]}" pages project create "${PROJECT_NAME}" --production-branch "${PRODUCTION_BRANCH}"
fi

echo "==> Deploying ./website to ${PROJECT_NAME} (branch=${PRODUCTION_BRANCH})"
"${WRANGLER[@]}" pages deploy ./website --project-name "${PROJECT_NAME}" --branch "${PRODUCTION_BRANCH}" --commit-dirty=true

echo
echo "Home:     https://lovely-home.co.uk/"
echo "Included: https://lovely-home.co.uk/included.html"
echo "Setup:    https://lovely-home.co.uk/setup.html"
echo "Security: https://lovely-home.co.uk/security.html"
echo "Pricing:  https://lovely-home.co.uk/pricing.html"
echo "Gallery:  https://lovely-home.co.uk/app.html"
echo "Support:  https://lovely-home.co.uk/support.html"
echo "Signup:   https://lovely-home.co.uk/signup.html"
echo "Success:  https://lovely-home.co.uk/signup-success.html"
echo "Privacy:  https://lovely-home.co.uk/privacy.html"
echo "Terms:    https://lovely-home.co.uk/terms.html"
echo
echo "If the custom domain is not attached yet, add lovely-home.co.uk in Cloudflare Pages → lovely-home → Custom domains."
