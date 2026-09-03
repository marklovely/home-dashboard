#!/usr/bin/env bash
# Import the marketing unauthorised-page Access app if Cloudflare still has it
# and Terraform state does not (e.g. after a targeted destroy left it behind).
#
# Usage (from repo root, after terraform init + generate-hub-tfvars):
#   bash scripts/import-marketing-access-unauthorised.sh \
#     -var-file=environments/hub.generated.tfvars \
#     -var-file=environments/hub.generated.secrets.tfvars.json \
#     -var=terraform_stack=platform
set -euo pipefail

TF_ARGS=("$@")
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/terraform"
ADDRESS='module.marketing_site[0].cloudflare_zero_trust_access_application.access_unauthorised'
APP_NAME='Lovely Home — Access unauthorised page'

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN first." >&2
  exit 1
fi

cd "$TF_DIR"

if terraform state list 2>/dev/null | grep -q "^${ADDRESS}$"; then
  echo "Already in state: ${ADDRESS}"
  exit 0
fi

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
if [[ -z "$ACCOUNT_ID" ]]; then
  echo "Set CLOUDFLARE_ACCOUNT_ID." >&2
  exit 1
fi

AUTH="Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
APPS_JSON="$(curl -sS -H "$AUTH" "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/access/apps?per_page=100")"

APP_ID="$(
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const name = process.argv[2];
    const apps = payload.result || [];
    const app = apps.find((row) => String(row.name || "") === name);
    if (app?.id) process.stdout.write(String(app.id));
  ' "$APPS_JSON" "$APP_NAME"
)"

if [[ -z "$APP_ID" ]]; then
  echo "Could not find Access app named ${APP_NAME}; skipping import."
  exit 0
fi

IMPORT_ID="accounts/${ACCOUNT_ID}/${APP_ID}"
echo "Importing ${ADDRESS}"
echo "  id=${IMPORT_ID}"
terraform import "${TF_ARGS[@]}" "$ADDRESS" "$IMPORT_ID"
