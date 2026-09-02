#!/usr/bin/env bash
# Check platform Pages project has Stripe billing env vars.
# Usage: bash scripts/verify-platform-stripe-env.sh
# Loads cloudflare_account_id from terraform/environments/hub.tfvars when unset.
# Set CLOUDFLARE_API_TOKEN (or platform_cf_api_token in hub.tfvars) for the API call.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HUB_TFVARS="${ROOT}/terraform/environments/hub.tfvars"
PROJECT="${PLATFORM_PAGES_PROJECT:-home-dashboard-platform}"

read_tfvar() {
  local key="$1"
  [[ -f "$HUB_TFVARS" ]] || return 1
  grep -E "^[[:space:]]*${key}[[:space:]]*=" "$HUB_TFVARS" 2>/dev/null | head -1 | sed -E 's/^[^"]*"([^"]*)".*$/\1/'
}

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  CLOUDFLARE_ACCOUNT_ID="$(read_tfvar cloudflare_account_id || true)"
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  CLOUDFLARE_API_TOKEN="$(read_tfvar platform_cf_api_token || true)"
fi

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "Set CLOUDFLARE_ACCOUNT_ID or add cloudflare_account_id to terraform/environments/hub.tfvars." >&2
  exit 1
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN (or platform_cf_api_token in hub.tfvars)." >&2
  exit 1
fi

RAW="$(curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PROJECT}")"

node -e "
const j = JSON.parse(process.argv[1]);
if (!j.success) {
  console.error('API error:', JSON.stringify(j.errors ?? j));
  process.exit(1);
}
const env = j.result?.deployment_configs?.production?.env_vars ?? {};
const secretConfigured = (entry) =>
  entry?.type === 'secret_text' || Boolean(entry?.value?.trim());
const id = env.STRIPE_SECRET_KEY;
const webhook = env.STRIPE_WEBHOOK_SECRET;
const price = env.STRIPE_PRICE_ID?.value;
console.log('Project:', j.result?.name ?? process.env.CF_PROJECT);
console.log(
  'STRIPE_SECRET_KEY:',
  secretConfigured(id) ? '(set — API hides secret values)' : 'MISSING'
);
console.log(
  'STRIPE_WEBHOOK_SECRET:',
  secretConfigured(webhook) ? '(set — API hides secret values)' : 'MISSING'
);
console.log('STRIPE_PRICE_ID:', price ? price : 'MISSING');
const liveId = env.STRIPE_SECRET_KEY_LIVE;
const liveWebhook = env.STRIPE_WEBHOOK_SECRET_LIVE;
const livePrice = env.STRIPE_PRICE_ID_LIVE?.value;
const livePriceYearly = env.STRIPE_PRICE_ID_YEARLY_LIVE?.value;
console.log(
  'STRIPE_SECRET_KEY_LIVE:',
  secretConfigured(liveId) ? '(set — API hides secret values)' : 'not set'
);
console.log(
  'STRIPE_WEBHOOK_SECRET_LIVE:',
  secretConfigured(liveWebhook) ? '(set — API hides secret values)' : 'not set'
);
console.log('STRIPE_PRICE_ID_LIVE:', livePrice ? livePrice : 'not set');
console.log('STRIPE_PRICE_ID_YEARLY_LIVE:', livePriceYearly ? livePriceYearly : 'not set');
if (!secretConfigured(id) || !secretConfigured(webhook) || !price) {
  console.error('');
  console.error('Add stripe_* to terraform/environments/hub.tfvars and run:');
  console.error('  cd terraform && terraform apply -var-file=environments/hub.tfvars');
  console.error('Also set STRIPE_* GitHub Actions secrets so CI provision does not wipe them.');
  process.exit(1);
}
console.log('');
console.log('Stripe Pages env looks configured.');
" "$RAW"
