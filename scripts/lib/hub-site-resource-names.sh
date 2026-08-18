#!/usr/bin/env bash
# Resolve Cloudflare resource names for a hub site (production uses legacy names).
# Usage: eval "$(bash scripts/lib/hub-site-resource-names.sh test mark-lovely67)"
set -euo pipefail

SITE_ID="${1:?site_id required}"
WORKERS_SUBDOMAIN="${2:-}"

if [[ "$SITE_ID" == "production" ]]; then
  WORKER_NAME="lovely-home-hub-api"
  PAGES_NAME="home-dashboard"
  D1_NAME="lovely-home-appliance-manuals"
  R2_GUIDES="lovely-home-appliance-guides"
  R2_MEDIA="lovely-home-guide-media"
else
  WORKER_NAME="lovely-home-hub-api-${SITE_ID}"
  PAGES_NAME="home-dashboard-${SITE_ID}"
  D1_NAME="lovely-home-appliance-manuals-${SITE_ID}"
  R2_GUIDES="lovely-home-appliance-guides-${SITE_ID}"
  R2_MEDIA="lovely-home-guide-media-${SITE_ID}"
fi

WORKER_HOST="${WORKER_NAME}.${WORKERS_SUBDOMAIN}.workers.dev"

printf 'WORKER_NAME=%q\n' "$WORKER_NAME"
printf 'PAGES_NAME=%q\n' "$PAGES_NAME"
printf 'D1_NAME=%q\n' "$D1_NAME"
printf 'R2_GUIDES=%q\n' "$R2_GUIDES"
printf 'R2_MEDIA=%q\n' "$R2_MEDIA"
printf 'WORKER_HOST=%q\n' "$WORKER_HOST"
