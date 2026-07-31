#!/usr/bin/env bash
# Reminder checklist for test Worker secrets (dummy values only).
set -euo pipefail
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

echo "Set each secret on the TEST Worker (wrangler secret put NAME --env test)."
echo "Use dummy values — never copy production PINs or Wi-Fi."
echo ""

for NAME in "${SECRETS[@]}"; do
  echo "  npx wrangler secret put $NAME --env test"
done

echo ""
echo "See docs/cloudflare-test-environment.md for suggested test values."
