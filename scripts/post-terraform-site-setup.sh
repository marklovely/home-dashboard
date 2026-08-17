#!/usr/bin/env bash
# Post-terraform setup: print Worker secret commands from terraform output.
# Usage: bash scripts/post-terraform-site-setup.sh sandbox
set -euo pipefail

SITE_ID="${1:-}"
if [[ -z "$SITE_ID" ]]; then
  echo "Usage: bash scripts/post-terraform-site-setup.sh <site_id>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

CONTRACT="$(node "$ROOT/scripts/lib/terraform-site-output.mjs" site "$SITE_ID")"
HUB_PROXY="$(node "$ROOT/scripts/lib/terraform-site-output.mjs" hub-proxy-secret "$SITE_ID")"

WORKER_AUD="$(node -e "console.log(JSON.parse(process.argv[1]).access_worker_aud)" "$CONTRACT")"
PAGES_AUD="$(node -e "console.log(JSON.parse(process.argv[1]).access_pages_aud)" "$CONTRACT")"
COMBINED_AUD="$(node -e "console.log(JSON.parse(process.argv[1]).access_aud_combined)" "$CONTRACT")"
TEAM="$(node -e "console.log(JSON.parse(process.argv[1]).cf_access_team_domain)" "$CONTRACT")"
WORKER_NAME="$(node -e "console.log(JSON.parse(process.argv[1]).worker_name)" "$CONTRACT")"

echo "==> Site: $SITE_ID"
echo "    Worker: $WORKER_NAME"
echo ""
echo "IMPORTANT — Wrangler vs Terraform auth:"
echo "  If CLOUDFLARE_API_TOKEN is set (for terraform), Wrangler uses it too."
echo "  That token often cannot set Worker secrets. Before deploy/secrets:"
echo ""
echo "    unset CLOUDFLARE_API_TOKEN"
echo "    cd worker && npx wrangler login"
echo ""
echo "Run these from worker/ (after wrangler login, token unset):"
echo ""
echo "  npx wrangler secret put HUB_PROXY_SECRET --env $SITE_ID"
echo "  # paste: $HUB_PROXY"
echo ""
echo "  npx wrangler secret put CF_ACCESS_TEAM_DOMAIN --env $SITE_ID"
echo "  # paste: $TEAM"
echo ""
echo "  npx wrangler secret put CF_ACCESS_AUD --env $SITE_ID"
echo "  # paste: $COMBINED_AUD"
echo "    (Worker AUD: $WORKER_AUD)"
echo "    (Pages AUD:  $PAGES_AUD)"
echo ""
echo "  npx wrangler secret put OWNER_EMAILS --env $SITE_ID"
echo "  # your owner email(s), comma-separated"
echo ""
echo "Then add Pages binding (Worker must exist):"
echo "  Dashboard → home-dashboard-${SITE_ID} → Settings → Bindings"
echo "  Service binding: HUB_API → ${WORKER_NAME}"
echo ""
echo "Redeploy Pages after env/binding changes."
