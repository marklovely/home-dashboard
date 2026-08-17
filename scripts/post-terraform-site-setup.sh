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
TF_DIR="$ROOT/terraform"

cd "$TF_DIR"

SITES_JSON="$(terraform output -json sites)"
HUB_SECRETS_JSON="$(terraform output -json hub_proxy_secrets)"

CONTRACT="$(node -e "
  const sites = JSON.parse(process.argv[1]);
  const site = sites[process.argv[2]];
  if (!site) {
    console.error('Site not in terraform output: ' + process.argv[2]);
    process.exit(1);
  }
  console.log(JSON.stringify(site));
" "$SITES_JSON" "$SITE_ID")"

HUB_PROXY="$(node -e "
  const secrets = JSON.parse(process.argv[1]);
  console.log(secrets[process.argv[2]] ?? '');
" "$HUB_SECRETS_JSON" "$SITE_ID")"

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
echo "Optional vanilla dummy secrets (see docs/cloudflare-test-environment.md):"
echo "  OWNER_PIN, VIRTUAL_BUTTONS_ACCESS_CODE, PRIVATE_WIFI_SSID, ..."
echo ""
echo "Then redeploy Pages so CF_ACCESS_AUD_PAGES picks up the Access app AUD."
