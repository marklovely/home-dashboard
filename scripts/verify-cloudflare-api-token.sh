#!/usr/bin/env bash
# Quick check that CLOUDFLARE_API_TOKEN can reach the APIs Terraform uses.
# Usage:
#   export CLOUDFLARE_API_TOKEN="..."
#   bash scripts/verify-cloudflare-api-token.sh
# Optional: ACCOUNT_ID=... ZONE_ID=... bash scripts/verify-cloudflare-api-token.sh
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
ACCOUNT_ID="${ACCOUNT_ID:-${CLOUDFLARE_ACCOUNT_ID:-}}"
ZONE_ID="${ZONE_ID:-${CLOUDFLARE_ZONE_ID:-}}"

if [[ -z "$TOKEN" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN first." >&2
  echo "  export CLOUDFLARE_API_TOKEN=\"your-api-token\"" >&2
  exit 1
fi

auth_header="Authorization: Bearer ${TOKEN}"

echo "==> Verify token (GET /user/tokens/verify)"
VERIFY="$(curl -sS -H "$auth_header" "https://api.cloudflare.com/client/v4/user/tokens/verify")"
echo "$VERIFY" | node -e "
  const j = JSON.parse(require('fs').readFileSync(0,'utf8'));
  if (!j.success) {
    console.error('Token invalid:', JSON.stringify(j.errors));
    process.exit(1);
  }
  console.log('  status:', j.result?.status);
  console.log('  id:    ', j.result?.id);
"

if [[ -n "$ACCOUNT_ID" ]]; then
  echo ""
  echo "==> Account access (GET /accounts/$ACCOUNT_ID)"
  ACCT="$(curl -sS -H "$auth_header" "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}")"
  echo "$ACCT" | node -e "
    const j = JSON.parse(require('fs').readFileSync(0,'utf8'));
    if (!j.success) {
      console.error('Account check failed:', JSON.stringify(j.errors));
      process.exit(1);
    }
    console.log('  name:', j.result?.name);
  "
else
  echo ""
  echo "(Skip account check — set ACCOUNT_ID or CLOUDFLARE_ACCOUNT_ID)"
fi

if [[ -n "$ZONE_ID" ]]; then
  echo ""
  echo "==> Zone access (GET /zones/$ZONE_ID)"
  ZONE="$(curl -sS -H "$auth_header" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}")"
  echo "$ZONE" | node -e "
    const j = JSON.parse(require('fs').readFileSync(0,'utf8'));
    if (!j.success) {
      console.error('Zone check failed:', JSON.stringify(j.errors));
      process.exit(1);
    }
    console.log('  zone:', j.result?.name);
  "
fi

echo ""
echo "Token looks valid. For terraform apply you also need WRITE permissions:"
echo "  Account: D1 Edit, Workers R2 Storage, Cloudflare Pages Edit, Access: Apps and Policies"
echo "  Zone lovely-home.co.uk: DNS Edit"
echo ""
echo "Create at: https://dash.cloudflare.com/profile/api-tokens"
echo "Use template 'Edit Cloudflare Workers' and add Zero Trust / Pages / D1 as needed."
