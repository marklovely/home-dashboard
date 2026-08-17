#!/usr/bin/env bash
# Reminder checklist for vanilla Worker secrets (dummy values only).
set -euo pipefail

ENV_NAME="${1:-test}"
cd "$(dirname "$0")/.."

SECRETS=(
  OWNER_PIN
  VIRTUAL_BUTTONS_ACCESS_CODE
  PRIVATE_WIFI_SSID
  PRIVATE_WIFI_PASSWORD
  PRIVATE_MARK_PHONE
  PRIVATE_MARK_EMAIL
  PRIVATE_DONNA_PHONE
  PRIVATE_DONNA_EMAIL
  PRIVATE_HOME_ADDRESS
  PRIVATE_LOCKBOX_CODE
  HUB_PROXY_SECRET
  CF_ACCESS_AUD
  CF_ACCESS_TEAM_DOMAIN
  OWNER_EMAILS
)

echo "Set each secret on the ${ENV_NAME} Worker (wrangler secret put NAME --env ${ENV_NAME})."
echo "Use dummy values for vanilla sites — never copy production PINs or Wi-Fi."
echo "For Terraform sites, run: bash ../scripts/post-terraform-site-setup.sh ${ENV_NAME}"
echo ""

for NAME in "${SECRETS[@]}"; do
  echo "  npx wrangler secret put $NAME --env ${ENV_NAME}"
done

echo ""
echo "See docs/cloudflare-test-environment.md and docs/platform-terraform.md."
