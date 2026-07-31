#!/usr/bin/env bash
# Create Cloudflare resources for the isolated test stack and patch worker/wrangler.toml.
# Requires: wrangler logged in (npx wrangler login), Node 22+ recommended.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WRANGLER_TOML="$ROOT/worker/wrangler.toml"
D1_NAME="lovely-home-appliance-manuals-test"
R2_GUIDES="lovely-home-appliance-guides-test"
R2_MEDIA="lovely-home-guide-media-test"

cd "$ROOT/worker"

if [[ ! -f "$WRANGLER_TOML" ]]; then
  echo "Missing $WRANGLER_TOML" >&2
  exit 1
fi

echo "==> Creating test D1 database: $D1_NAME"
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
  echo "Could not parse D1 database_id from wrangler output:" >&2
  echo "$D1_OUT" >&2
  exit 1
fi
echo "    database_id = $D1_ID"

for BUCKET in "$R2_GUIDES" "$R2_MEDIA"; do
  echo "==> Creating test R2 bucket: $BUCKET"
  if ! npx wrangler r2 bucket create "$BUCKET" 2>&1; then
    echo "    (bucket may already exist — continuing)"
  fi
done

if grep -q "REPLACE_AFTER_PROVISION_TEST" "$WRANGLER_TOML"; then
  echo "==> Patching worker/wrangler.toml [env.test] database_id"
  sed -i.bak "s/REPLACE_AFTER_PROVISION_TEST/$D1_ID/g" "$WRANGLER_TOML"
  rm -f "$WRANGLER_TOML.bak"
else
  echo "==> worker/wrangler.toml already has a test database_id (not REPLACE_AFTER_PROVISION_TEST)"
  echo "    If you need to change it, edit [env.test] manually. Current target: $D1_ID"
fi

echo ""
echo "Next steps:"
echo "  1. cd worker && npm run secrets:test    # dummy PIN, Wi-Fi, contacts"
echo "  2. cd worker && npm run d1:migrate:test"
echo "  3. cd worker && npm run deploy:test"
echo "  4. Create Pages project home-dashboard-test (see docs/cloudflare-test-environment.md)"
echo ""
echo "Commit the updated database_id in worker/wrangler.toml if this is a shared repo."
