#!/usr/bin/env bash
# Create Cloudflare D1/R2 for a Wrangler env when not using Terraform (legacy path).
# Prefer: terraform apply + scripts/sync-wrangler-from-terraform.mjs
# Usage: bash scripts/provision-hub-site.sh test|sandbox
set -euo pipefail

SITE_ID="${1:-}"
if [[ -z "$SITE_ID" ]]; then
  echo "Usage: bash scripts/provision-hub-site.sh <site_id>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WRANGLER_TOML="$ROOT/worker/wrangler.toml"
D1_NAME="lovely-home-appliance-manuals-${SITE_ID}"
R2_GUIDES="lovely-home-appliance-guides-${SITE_ID}"
R2_MEDIA="lovely-home-guide-media-${SITE_ID}"
PLACEHOLDER="REPLACE_AFTER_PROVISION_${SITE_ID^^}"

cd "$ROOT/worker"

if [[ ! -f "$WRANGLER_TOML" ]]; then
  echo "Missing $WRANGLER_TOML" >&2
  exit 1
fi

if ! grep -q "\\[env\\.${SITE_ID}\\]" "$WRANGLER_TOML"; then
  echo "Missing [env.${SITE_ID}] in worker/wrangler.toml" >&2
  exit 1
fi

echo "==> Creating D1 database: $D1_NAME"
D1_OUT="$(npx wrangler d1 create "$D1_NAME" 2>&1)" || {
  if echo "$D1_OUT" | grep -qi "already exists"; then
    echo "    Database already exists — fetching ID from wrangler d1 list"
    D1_OUT="$(npx wrangler d1 list 2>&1)"
  else
    echo "$D1_OUT" >&2
    exit 1
  fi
}

D1_ID="$(echo "$D1_OUT" | grep -Eo '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
if [[ -z "$D1_ID" ]]; then
  echo "Could not parse D1 database_id:" >&2
  echo "$D1_OUT" >&2
  exit 1
fi
echo "    database_id = $D1_ID"

for BUCKET in "$R2_GUIDES" "$R2_MEDIA"; do
  echo "==> Creating R2 bucket: $BUCKET"
  if ! npx wrangler r2 bucket create "$BUCKET" 2>&1; then
    echo "    (bucket may already exist — continuing)"
  fi
done

if grep -q "$PLACEHOLDER" "$WRANGLER_TOML"; then
  echo "==> Patching worker/wrangler.toml [env.${SITE_ID}] database_id"
  sed -i.bak "s/$PLACEHOLDER/$D1_ID/g" "$WRANGLER_TOML"
  rm -f "$WRANGLER_TOML.bak"
else
  echo "==> No placeholder $PLACEHOLDER — edit [env.${SITE_ID}] manually if needed (target id: $D1_ID)"
fi

echo ""
echo "Next steps:"
echo "  cd worker && npm run secrets:${SITE_ID}"
echo "  cd worker && npm run d1:migrate:${SITE_ID}"
echo "  cd worker && npm run deploy:${SITE_ID}"
echo "  Configure Pages + Access (or use terraform apply — see docs/platform-terraform.md)"
