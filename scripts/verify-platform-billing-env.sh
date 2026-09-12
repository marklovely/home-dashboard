#!/usr/bin/env bash
# Probe Cloudflare billable usage with the platform Pages API token.
# Usage: export CLOUDFLARE_API_TOKEN=... && bash scripts/verify-platform-billing-env.sh
set -euo pipefail

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-2c810bbed7e633623b99ae7c51dd0aa2}"
TOKEN="${CLOUDFLARE_API_TOKEN:-${PLATFORM_CF_API_TOKEN:-}}"
FROM="$(date -u +%Y-%m-01)"
TO="$(date -u +%Y-%m-%d)"

if [[ -z "$TOKEN" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN or PLATFORM_CF_API_TOKEN first." >&2
  exit 1
fi

probe() {
  local path="$1"
  local label="$2"
  echo "==> $label"
  local raw
  raw="$(curl -sS -H "Authorization: Bearer $TOKEN" \
    "https://api.cloudflare.com/client/v4${path}?from=${FROM}&to=${TO}")"
  node -e "
const body = JSON.parse(process.argv[1]);
const err = body.errors?.[0];
if (!body.success) {
  console.log('FAIL:', err?.code ?? 'unknown', '-', err?.message ?? 'request failed');
  process.exit(1);
}
const rows = Array.isArray(body.result) ? body.result : [];
console.log('OK:', rows.length, 'usage row(s)');
if (rows[0]) {
  const row = rows[0];
  console.log('Sample:', row.x_BillableMetricName ?? row.ChargeDescription ?? row.ServiceName ?? 'row');
}
" "$raw"
}

probe "/accounts/${ACCOUNT_ID}/billable-usage" "Billable usage v1"
probe "/accounts/${ACCOUNT_ID}/billable/usage" "Billable usage v2 (restricted)"

echo ""
echo "If v1 OK but Monitoring still fails, retry deployment on home-dashboard-platform."
