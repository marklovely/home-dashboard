#!/usr/bin/env bash
# Build and deploy the dashboard to a Cloudflare Pages project (production branch).
# Builds once per invocation — for fleet rollouts use build-hub-pages-artifact.sh
# plus deploy-hub-pages-from-artifact.sh, or the CD — Hub Pages GitHub workflow.
#
# Usage: bash scripts/deploy-cloudflare-pages-site.sh sandbox
# Requires: npx wrangler login (unset CLOUDFLARE_API_TOKEN first)
set -euo pipefail

SITE_ID="${1:-}"
if [[ -z "$SITE_ID" ]]; then
  echo "Usage: bash scripts/deploy-cloudflare-pages-site.sh <site_id>" >&2
  echo "Example: bash scripts/deploy-cloudflare-pages-site.sh sandbox" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "$ROOT/scripts/build-hub-pages-artifact.sh"
bash "$ROOT/scripts/deploy-hub-pages-from-artifact.sh" "$SITE_ID"
