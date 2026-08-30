#!/usr/bin/env bash
# Check platform Pages project has Stripe billing env vars.
# Usage: CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... bash scripts/verify-platform-stripe-env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="${PLATFORM_PAGES_PROJECT:-home-dashboard-platform}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"
TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"

node -e "
const token = process.env.CF_TOKEN;
const accountId = process.env.CF_ACCOUNT;
const project = process.env.CF_PROJECT;
const res = await fetch(
  'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/pages/projects/' + project,
  { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }
);
const body = await res.json();
if (!body.success) {
  console.error('API error:', JSON.stringify(body.errors ?? body));
  process.exit(1);
}
const env = body.result?.deployment_configs?.production?.env_vars ?? {};
const id = env.STRIPE_SECRET_KEY?.value;
const webhook = env.STRIPE_WEBHOOK_SECRET;
const price = env.STRIPE_PRICE_ID?.value;
console.log('Project:', project);
console.log('STRIPE_SECRET_KEY:', id ? '(set)' : 'MISSING');
console.log('STRIPE_WEBHOOK_SECRET:', webhook ? '(set)' : 'MISSING');
console.log('STRIPE_PRICE_ID:', price ? price : 'MISSING');
if (!id || !webhook || !price) {
  console.error('');
  console.error('Add stripe_* to terraform/environments/hub.tfvars and run terraform apply,');
  console.error('or set STRIPE_* GitHub Actions secrets for CI provision workflows.');
  console.error('Dashboard-only vars are removed on the next terraform apply.');
  process.exit(1);
}
" CF_TOKEN="$TOKEN" CF_ACCOUNT="$ACCOUNT_ID" CF_PROJECT="$PROJECT"
