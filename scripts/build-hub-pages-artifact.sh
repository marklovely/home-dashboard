#!/usr/bin/env bash
# Build hub dashboard assets once (shared across all hub Pages projects).
#
# Usage: bash scripts/build-hub-pages-artifact.sh
# Env: SKIP_NPM_CI=1 when dependencies are already installed (CI build job).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${SKIP_NPM_CI:-}" ]]; then
  npm ci
fi

echo "==> Building shared hub Pages artifact (hostname/runtime-config patched per site at deploy)"
VITE_DEPLOYMENT_MODE=home npm run build

echo "==> Staging hub-only Pages Functions"
rm -rf dist-hub-functions
node scripts/prune-hub-pages-functions.mjs --out dist-hub-functions/functions

echo "==> Hub Pages artifact ready (dist/ + dist-hub-functions/)"
