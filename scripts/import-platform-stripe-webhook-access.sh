#!/usr/bin/env bash
# Import the manually created Stripe webhook Access app into Terraform state.
#
# Usage (from repo root, after creating the app in Zero Trust):
#   export CLOUDFLARE_API_TOKEN="..."
#   export CLOUDFLARE_ACCOUNT_ID="..."   # optional if in tfvars
#   bash scripts/import-platform-stripe-webhook-access.sh -var-file=environments/hub.tfvars
#
# Then: cd terraform && terraform apply -var-file=environments/hub.tfvars
set -euo pipefail

TF_ARGS=("$@")
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/terraform"
WEBHOOK_PATH="platform.lovely-home.co.uk/api/stripe/webhook"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN first." >&2
  exit 1
fi

cd "$TF_DIR"

if [[ ! -f .terraform.lock.hcl ]]; then
  echo "Run: cd terraform && terraform init" >&2
  exit 1
fi

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
if [[ -z "$ACCOUNT_ID" ]]; then
  ACCOUNT_ID="$(terraform console "${TF_ARGS[@]}" -no-color <<< 'var.cloudflare_account_id' 2>/dev/null | tail -1 | tr -d ' "')"
fi
if [[ -z "$ACCOUNT_ID" ]]; then
  echo "Set CLOUDFLARE_ACCOUNT_ID or cloudflare_account_id in tfvars." >&2
  exit 1
fi

AUTH="Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
APPS_JSON="$(curl -sS -H "$AUTH" "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/access/apps?per_page=100")"

APP_ID="$(python3 - <<'PY' "$WEBHOOK_PATH" "$APPS_JSON"
import json, sys
needle = sys.argv[1].lower()
payload = json.loads(sys.argv[2])
for app in payload.get("result") or []:
    hosts = []
    domain = str(app.get("domain") or "").strip().lower()
    if domain:
        hosts.append(domain)
    for dest in app.get("destinations") or []:
        uri = str(dest.get("uri") or "").strip().lower()
        if uri:
            hosts.append(uri)
    if any(h == needle or h.endswith("/api/stripe/webhook") and "platform.lovely-home.co.uk" in h for h in hosts):
        print(app.get("id") or "")
        break
PY
)"

if [[ -z "$APP_ID" ]]; then
  echo "Could not find Access app for ${WEBHOOK_PATH}." >&2
  echo "Create it in Zero Trust → Access → Applications (Bypass / Everyone), then re-run." >&2
  exit 1
fi

IMPORT_ID="accounts/${ACCOUNT_ID}/${APP_ID}"
ADDRESS='module.platform_admin[0].cloudflare_zero_trust_access_application.platform_stripe_webhook'

echo "Importing ${ADDRESS}"
echo "  id=${IMPORT_ID}"

terraform import "${TF_ARGS[@]}" "$ADDRESS" "$IMPORT_ID"

echo ""
echo "Done. Run: cd terraform && terraform apply ${TF_ARGS[*]}"
