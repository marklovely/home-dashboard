#!/usr/bin/env bash
# Import an existing manually provisioned hub site into Terraform state.
# Usage (from repo root):
#   export CLOUDFLARE_API_TOKEN="..."
#   bash scripts/terraform-import-hub-site.sh test -var-file=environments/hub.tfvars
#
# Before importing test Pages: remove HUB_PROXY_SECRET from the Pages project dashboard
# (Cloudflare blocks Pages import while secret env vars exist). Set hub_proxy_secret in
# tfvars to the same value — Terraform re-applies it after import.
set -euo pipefail

SITE_ID="${1:-}"
shift || true
TF_ARGS=("$@")

if [[ -z "$SITE_ID" ]]; then
  echo "Usage: bash scripts/terraform-import-hub-site.sh <site_id> [terraform plan/apply args...]" >&2
  echo "Example: bash scripts/terraform-import-hub-site.sh test -var-file=environments/hub.tfvars" >&2
  exit 1
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN first." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/terraform"
WRANGLER_TOML="$ROOT/worker/wrangler.toml"
AUTH="Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"

cd "$TF_DIR"

if [[ ! -f .terraform.lock.hcl ]]; then
  echo "Run: cd terraform && terraform init" >&2
  exit 1
fi

tf_console() {
  terraform console "${TF_ARGS[@]}" -no-color <<< "$1" 2>/dev/null | tail -1 | tr -d ' "'
}

ACCOUNT_ID="$(tf_console 'var.cloudflare_account_id')"
ZONE_ID="$(tf_console 'var.cloudflare_zone_id')"
WORKERS_SUBDOMAIN="$(tf_console 'var.workers_subdomain')"
HOSTNAME="$(tf_console "var.sites[\"${SITE_ID}\"].hostname")"
TERRAFORM_ENABLED="$(tf_console "var.sites[\"${SITE_ID}\"].terraform")"

if [[ "$TERRAFORM_ENABLED" != "true" ]]; then
  echo "sites.${SITE_ID}.terraform must be true in your var-file before import." >&2
  exit 1
fi

if [[ -z "$ACCOUNT_ID" || -z "$ZONE_ID" || -z "$HOSTNAME" ]]; then
  echo "Could not read account_id, zone_id, or sites.${SITE_ID}.hostname from Terraform vars." >&2
  exit 1
fi

eval "$(bash "$ROOT/scripts/lib/hub-site-resource-names.sh" "$SITE_ID" "$WORKERS_SUBDOMAIN")"
MODULE="module.hub_site[\"${SITE_ID}\"]"

echo "==> Importing site: $SITE_ID"
echo "    hostname:      $HOSTNAME"
echo "    pages project: $PAGES_NAME"
echo "    worker:        $WORKER_HOST"
echo ""

cf_get() {
  curl -sS -H "$AUTH" -H "Content-Type: application/json" "$1"
}

cf_json_ok() {
  node -e "
    const j = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    if (!j.success) {
      console.error(JSON.stringify(j.errors, null, 2));
      process.exit(1);
    }
    process.stdout.write(JSON.stringify(j.result));
  "
}

echo "==> Resolving D1 database id"
if [[ "$SITE_ID" == "production" ]]; then
  D1_ID="$(grep -A5 '^\[\[d1_databases\]\]' "$WRANGLER_TOML" | grep 'database_id' | head -1 | grep -Eo '[0-9a-f-]{36}' || true)"
else
  D1_ID="$(grep -A3 "\\[env\\.${SITE_ID}\\]" "$WRANGLER_TOML" | grep 'database_id' | head -1 | grep -Eo '[0-9a-f-]{36}' || true)"
fi
if [[ -z "$D1_ID" ]]; then
  D1_LIST="$(cf_get "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database")"
  D1_ID="$(echo "$D1_LIST" | cf_json_ok | node -e "
    const site = process.argv[1];
    const dbs = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const row = dbs.find((d) => d.name === site);
    if (!row) process.exit(1);
    console.log(row.uuid);
  " "$D1_NAME")"
fi
echo "    $D1_ID"

echo "==> Resolving Access application ids"
ACCESS_APPS="$(cf_get "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/access/apps?per_page=100")"
read -r PAGES_APP_ID WORKER_APP_ID <<< "$(echo "$ACCESS_APPS" | cf_json_ok | node -e "
  const hostname = process.argv[1];
  const workerHost = process.argv[2];
  const apps = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  const pages = apps.find((a) => a.domain === hostname || (a.destinations || []).some((d) => d.uri === hostname));
  const worker = apps.find((a) => a.domain === workerHost || (a.destinations || []).some((d) => d.uri === workerHost));
  if (!pages?.id || !worker?.id) {
    if (!pages?.id) console.error('Pages Access app not found for', hostname);
    if (!worker?.id) console.error('Worker Access app not found for', workerHost);
    process.exit(1);
  }
  console.log(pages.id, worker.id);
" "$HOSTNAME" "$WORKER_HOST")"
echo "    pages app:  $PAGES_APP_ID"
echo "    worker app: $WORKER_APP_ID"

echo "==> Resolving DNS record id"
DNS_RECORDS="$(cf_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=CNAME&name=${HOSTNAME}")"
DNS_ID="$(echo "$DNS_RECORDS" | cf_json_ok | node -e "
  const rows = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  if (!rows.length) process.exit(1);
  console.log(rows[0].id);
")"
echo "    $DNS_ID"

echo "==> Checking Pages project (secret env vars block import)"
PAGES_PROJECT="$(cf_get "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PAGES_NAME}")"
HAS_SECRET_ENV="$(echo "$PAGES_PROJECT" | cf_json_ok | node -e "
  const project = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  const prod = project.deployment_configs?.production?.env_vars || {};
  const secrets = Object.values(prod).filter((v) => v && v.type === 'secret_text');
  console.log(secrets.length > 0 ? 'yes' : 'no');
")"
if [[ "$HAS_SECRET_ENV" == "yes" ]]; then
  echo ""
  echo "ERROR: ${PAGES_NAME} has secret environment variables (likely HUB_PROXY_SECRET)." >&2
  echo "Cloudflare cannot import Pages projects with secret env vars." >&2
  echo "" >&2
  echo "Fix:" >&2
  echo "  1. Copy HUB_PROXY_SECRET from Pages → Settings → Environment variables" >&2
  echo "  2. Add hub_proxy_secret = \"...\" under sites.${SITE_ID} in your tfvars" >&2
  echo "  3. Delete HUB_PROXY_SECRET from the Pages dashboard (Production env)" >&2
  echo "  4. Re-run this script" >&2
  echo "  5. terraform apply will restore the secret from tfvars" >&2
  exit 1
fi

import_resource() {
  local address="$1"
  local import_id="$2"
  if terraform state show -no-color "$address" >/dev/null 2>&1; then
    echo ""
    echo "==> skip (already in state): ${address}"
    return 0
  fi
  echo ""
  echo "==> terraform import ${address}"
  echo "    id: ${import_id}"
  terraform import "${TF_ARGS[@]}" "$address" "$import_id"
}

import_resource "${MODULE}.cloudflare_d1_database.manuals" "${ACCOUNT_ID}/${D1_ID}"
import_resource "${MODULE}.cloudflare_r2_bucket.guides" "${ACCOUNT_ID}/${R2_GUIDES}/default"
import_resource "${MODULE}.cloudflare_r2_bucket.media" "${ACCOUNT_ID}/${R2_MEDIA}/default"
import_resource "${MODULE}.cloudflare_zero_trust_access_application.pages" "accounts/${ACCOUNT_ID}/${PAGES_APP_ID}"
import_resource "${MODULE}.cloudflare_zero_trust_access_application.worker" "accounts/${ACCOUNT_ID}/${WORKER_APP_ID}"
import_resource "${MODULE}.cloudflare_pages_project.dashboard" "${ACCOUNT_ID}/${PAGES_NAME}"
import_resource "${MODULE}.cloudflare_pages_domain.custom" "${ACCOUNT_ID}/${PAGES_NAME}/${HOSTNAME}"
import_resource "${MODULE}.cloudflare_dns_record.pages" "${ZONE_ID}/${DNS_ID}"

echo ""
echo "==> Import complete for ${SITE_ID}"
echo ""
echo "Next:"
echo "  1. Ensure hub_proxy_secret is set in tfvars if you removed it from Pages for import"
echo "  2. cd terraform && terraform plan ${TF_ARGS[*]}"
echo "  3. Review drift (Access policy names, Pages env vars). Apply when plan looks safe."
echo "  4. Re-add HUB_API service binding in Pages dashboard if attach_hub_api_binding = false"
echo "  5. Update platform/sites.yaml: set sites.${SITE_ID}.terraform: true"
if [[ "$SITE_ID" == "production" ]]; then
  echo ""
  echo "Production notes:"
  echo "  - Pages project: home-dashboard (not home-dashboard-production)"
  echo "  - Worker: lovely-home-hub-api (default wrangler env, not --env production)"
  echo "  - Run scripts/terraform-plan-production-safe.sh before apply"
fi
