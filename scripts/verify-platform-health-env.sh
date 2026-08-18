#!/usr/bin/env bash
# Check platform Pages project has health-probe service token env vars.
# Usage: export CLOUDFLARE_API_TOKEN=... && bash scripts/verify-platform-health-env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-2c810bbed7e633623b99ae7c51dd0aa2}"
PROJECT="${PLATFORM_PAGES_PROJECT:-home-dashboard-platform}"
TOKEN="${CLOUDFLARE_API_TOKEN:-}"
PROBE_URL="${PLATFORM_HEALTH_PROBE_URL:-https://test.lovely-home.co.uk/api/health}"

if [[ -z "$TOKEN" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN first." >&2
  exit 1
fi

RAW="$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}")"

node -e "
const j = JSON.parse(process.argv[1]);
if (!j.success) {
  console.error('API error:', JSON.stringify(j.errors));
  process.exit(1);
}
const env = j.result?.deployment_configs?.production?.env_vars ?? {};
const id = env.PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID?.value;
const secret = env.PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET;
const secretConfigured =
  secret?.type === 'secret_text' || Boolean(secret?.value?.trim());
console.log('Project:', j.result?.name);
console.log('PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID:', id ? '(set)' : 'MISSING');
console.log(
  'PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET:',
  secretConfigured ? '(set — API hides secret values)' : 'MISSING'
);
if (!id || !secretConfigured) {
  console.log('');
  console.log('Fix: cd terraform && terraform apply -var-file=environments/hub.tfvars');
  console.log('Or add both vars manually under Pages → Settings → Environment variables (Production).');
  process.exit(1);
}
console.log('');
console.log('Pages env looks configured.');
" "$RAW"

echo "==> Live probe (optional — needs token secret from Zero Trust dashboard)"
echo "Pages env keys are present. Retry Check health on the platform dashboard."
echo "If it still fails, copy Client Secret from Zero Trust → Service Tokens and test:"
echo "  curl -H 'CF-Access-Client-Id: <id>' -H 'CF-Access-Client-Secret: <secret>' $PROBE_URL"
