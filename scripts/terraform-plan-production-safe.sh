#!/usr/bin/env bash
# Fail if a terraform plan would destroy production hub resources.
# Usage: bash scripts/terraform-plan-production-safe.sh -var-file=environments/hub.tfvars
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLAN_FILE="$(mktemp)"
trap 'rm -f "$PLAN_FILE"' EXIT

cd "$ROOT/terraform"
terraform plan -out="$PLAN_FILE" "$@" >/dev/null

if terraform show -no-color "$PLAN_FILE" | grep -q 'module.hub_site\["production"\].*will be destroyed'; then
  echo "ERROR: plan would destroy production hub resources." >&2
  echo "Review with: terraform show $PLAN_FILE" >&2
  exit 1
fi

echo "OK — no production hub destroys in plan."
