#!/usr/bin/env bash
# Deploy a pre-built hub Pages artifact to one site (no Vite rebuild).
#
# Usage: bash scripts/deploy-hub-pages-from-artifact.sh larchmount
# Requires dist/ and dist-hub-functions/ from build-hub-pages-artifact.sh
set -euo pipefail

SITE_ID="${1:-}"
if [[ -z "$SITE_ID" ]]; then
  echo "Usage: bash scripts/deploy-hub-pages-from-artifact.sh <site_id>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
eval "$(bash "$ROOT/scripts/lib/hub-site-resource-names.sh" "$SITE_ID")"
PAGES_PROJECT="$PAGES_NAME"
BRANCH="${PAGES_BRANCH:-main}"

if [[ ! -d "$ROOT/dist" ]]; then
  echo "Missing dist/ — run scripts/build-hub-pages-artifact.sh first." >&2
  exit 1
fi
if [[ ! -d "$ROOT/dist-hub-functions/functions" ]]; then
  echo "Missing dist-hub-functions/functions — run scripts/build-hub-pages-artifact.sh first." >&2
  exit 1
fi
if [[ ! -d "$ROOT/node_modules/@cloudflare/pages-plugin-cloudflare-access" ]]; then
  echo "Missing root npm deps — run npm ci in the repo root (Pages Functions middleware imports @cloudflare/pages-plugin-cloudflare-access)." >&2
  exit 1
fi

if [[ -x "$ROOT/worker/node_modules/.bin/wrangler" ]]; then
  WRANGLER=("$ROOT/worker/node_modules/.bin/wrangler")
else
  WRANGLER=(npx wrangler)
fi

echo "==> Writing runtime-config for $SITE_ID"
node "$ROOT/scripts/write-hub-runtime-config.mjs" --site-id "$SITE_ID" --out "$ROOT/dist/runtime-config.json"

echo "==> Deploying to $PAGES_PROJECT (site=$SITE_ID)"

pages_deploy() {
  (
    cd "$ROOT/dist-hub-functions"
    "${WRANGLER[@]}" pages deploy "$ROOT/dist" \
      --project-name="$PAGES_PROJECT" \
      --branch="$BRANCH" \
      --commit-dirty=true
  )
}

pages_deploy

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" && -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo ""
  echo "==> Attaching HUB_API Pages binding"
  node "$ROOT/scripts/attach-hub-api-pages-binding.mjs" "$SITE_ID"
  echo ""
  echo "==> Redeploying Pages so the active deployment picks up HUB_API"
  pages_deploy
else
  echo ""
  echo "NOTE: HUB_API binding was NOT attached (set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)."
fi

echo ""
echo "Done. Deployed $SITE_ID to https://${PAGES_PROJECT}.pages.dev"
