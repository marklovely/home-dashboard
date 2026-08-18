#!/usr/bin/env bash
# Quick check that CLOUDFLARE_API_TOKEN can reach the APIs Terraform uses.
# Usage:
#   export CLOUDFLARE_API_TOKEN="..."
#   export CLOUDFLARE_ACCOUNT_ID="..."
#   export CLOUDFLARE_ZONE_ID="..."
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

check_json() {
  local label="$1"
  local body="$2"
  node -e "
    const j = JSON.parse(process.argv[1]);
    const label = process.argv[2];
    if (!j.success) {
      const code = j.errors?.[0]?.code;
      const msg = j.errors?.[0]?.message ?? JSON.stringify(j.errors);
      console.error(label + ' failed (' + code + '): ' + msg);
      process.exit(1);
    }
    console.log('  ok:', label);
  " "$body" "$label"
}

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

if [[ -z "$ACCOUNT_ID" ]]; then
  echo ""
  echo "ERROR: Set CLOUDFLARE_ACCOUNT_ID (GitHub secret / env) — required for provision." >&2
  exit 1
fi

echo ""
echo "==> Account access (GET /accounts/$ACCOUNT_ID)"
ACCT="$(curl -sS -H "$auth_header" "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}")"
echo "$ACCT" | node -e "
  const j = JSON.parse(require('fs').readFileSync(0,'utf8'));
  if (!j.success) {
    console.error('Account check failed:', JSON.stringify(j.errors));
    console.error('Token may not include this account, or CLOUDFLARE_ACCOUNT_ID is wrong.');
    process.exit(1);
  }
  console.log('  name:', j.result?.name);
"

echo ""
echo "==> Provision APIs (list/read — same auth as terraform create)"
check_json "D1 databases" "$(curl -sS -H "$auth_header" "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database?per_page=1")"
check_json "Zero Trust Access apps" "$(curl -sS -H "$auth_header" "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/access/apps?per_page=1")"
check_json "R2 buckets" "$(curl -sS -H "$auth_header" "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets")"
check_json "Workers scripts" "$(curl -sS -H "$auth_header" "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts")"
check_json "Workers account subdomain" "$(curl -sS -H "$auth_header" "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/subdomain")"

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
  check_json "Workers routes" "$(curl -sS -H "$auth_header" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/workers/routes?per_page=1")"
else
  echo ""
  echo "(Skip zone check — set CLOUDFLARE_ZONE_ID)"
fi

echo ""
echo "Token can reach Terraform + Wrangler provision APIs for account ${ACCOUNT_ID}."
echo "Required permissions: D1 Edit, R2 Edit, Pages Edit, Access Apps/Policies Edit,"
echo "Access Service Tokens Edit, Workers Scripts Edit, Zone Workers Routes Edit, Zone DNS Edit."
echo "Optional (quieter wrangler whoami): User Memberships Read, User Details Read."
echo "Create at: https://dash.cloudflare.com/profile/api-tokens"
