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
console.log('OK:', rows.length, 'usage row(s) for', process.argv[2], 'to', process.argv[3]);
if (rows.length === 0) {
  console.log('     (No billable rows yet — normal on free tier or early in the month.)');
} else {
  const row = rows[0];
  console.log('Sample:', row.x_BillableMetricName ?? row.ChargeDescription ?? row.ServiceName ?? 'row');
}
" "$raw" "$FROM" "$TO"
}

echo "Date range: $FROM to $TO"
echo ""

V1_OK=0
if probe "/accounts/${ACCOUNT_ID}/billable-usage" "Billable usage v1 (use this — Monitoring relies on it)"; then
  V1_OK=1
fi

echo ""
echo "==> Billable usage v2 (restricted — ignore if this fails)"
if probe "/accounts/${ACCOUNT_ID}/billable/usage" "Billable usage v2"; then
  echo "     v2 also works on this account (unusual)."
else
  echo "     Expected on most accounts — v2 needs restricted access. v1 is enough."
fi

echo ""
if [[ "$V1_OK" -eq 1 ]]; then
  echo "Token billing access: OK (Account → Billing → Read is working)."
  echo "If Monitoring still shows a permission error, merge PR #451 and retry deployment on home-dashboard-platform."
  echo "The live platform may still be calling v2 first on old code."
else
  echo "Token billing access: NOT OK — add Account → Billing → Read, update GitHub PLATFORM_CF_API_TOKEN, terraform apply, redeploy Pages."
  exit 1
fi
