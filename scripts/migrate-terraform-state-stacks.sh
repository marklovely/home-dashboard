#!/usr/bin/env bash
# Pull legacy hub.tfstate, split into platform.tfstate + customers.tfstate, push
# the new keys. Does not delete or overwrite hub.tfstate (backup).
#
# Usage: bash scripts/migrate-terraform-state-stacks.sh split-stacks
set -euo pipefail

if [[ "${1:-}" != "split-stacks" ]]; then
  echo "Refusing to migrate — pass split-stacks as the first argument." >&2
  echo "Usage: bash scripts/migrate-terraform-state-stacks.sh split-stacks" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/tf-stack-split.XXXXXX")"
trap 'rm -rf "${WORK}"' EXIT

if [[ -z "${TF_STATE_R2_BUCKET:-}" || -z "${TF_STATE_R2_ENDPOINT:-}" ]]; then
  echo "Set TF_STATE_R2_BUCKET and TF_STATE_R2_ENDPOINT." >&2
  exit 1
fi

legacy_init() {
  cd "${ROOT}/terraform"
  terraform init \
    -reconfigure \
    -backend-config="bucket=${TF_STATE_R2_BUCKET}" \
    -backend-config="key=home-dashboard/hub.tfstate" \
    -backend-config="region=auto" \
    -backend-config="endpoints={s3=\"${TF_STATE_R2_ENDPOINT}\"}" \
    -backend-config="skip_credentials_validation=true" \
    -backend-config="skip_metadata_api_check=true" \
    -backend-config="skip_region_validation=true" \
    -backend-config="skip_requesting_account_id=true" \
    -backend-config="use_path_style=true"
}

echo "==> Init legacy hub.tfstate (read-only source)"
legacy_init
terraform -chdir="${ROOT}/terraform" state pull > "${WORK}/legacy.tfstate.json"
if ! grep -q '"resources"' "${WORK}/legacy.tfstate.json"; then
  echo "Legacy hub.tfstate pull did not look like Terraform state JSON." >&2
  exit 1
fi

state_is_empty() {
  local list
  list="$(terraform -chdir="${ROOT}/terraform" state list 2>/dev/null || true)"
  [[ -z "${list}" ]]
}

echo "==> Check platform.tfstate"
bash "${ROOT}/scripts/terraform-init-r2.sh" platform --reconfigure
PLATFORM_EMPTY=0
if state_is_empty; then
  PLATFORM_EMPTY=1
fi

echo "==> Check customers.tfstate"
bash "${ROOT}/scripts/terraform-init-r2.sh" customers --reconfigure
CUSTOMERS_EMPTY=0
if state_is_empty; then
  CUSTOMERS_EMPTY=1
fi

if [[ "${PLATFORM_EMPTY}" -eq 0 && "${CUSTOMERS_EMPTY}" -eq 0 ]]; then
  echo "Both split backends already have state — migration already ran. hub.tfstate was left in place."
  exit 0
fi

if [[ "${PLATFORM_EMPTY}" -ne 1 || "${CUSTOMERS_EMPTY}" -ne 1 ]]; then
  echo "Partial migration: one split backend is populated and the other is empty. Refusing to push." >&2
  exit 1
fi

echo "==> Split legacy state"
node "${ROOT}/scripts/migrate-terraform-state-stacks.mjs" \
  --input "${WORK}/legacy.tfstate.json" \
  --platform-out "${WORK}/platform.tfstate.json" \
  --customers-out "${WORK}/customers.tfstate.json"

echo "==> Push platform.tfstate"
bash "${ROOT}/scripts/terraform-init-r2.sh" platform --reconfigure
terraform -chdir="${ROOT}/terraform" state push -force "${WORK}/platform.tfstate.json"
node "${ROOT}/scripts/assert-terraform-stack-state.mjs" platform

echo "==> Push customers.tfstate"
bash "${ROOT}/scripts/terraform-init-r2.sh" customers --reconfigure
terraform -chdir="${ROOT}/terraform" state push -force "${WORK}/customers.tfstate.json"
node "${ROOT}/scripts/assert-terraform-stack-state.mjs" customers

echo "Migration complete. Leave home-dashboard/hub.tfstate in R2 as a backup — do not apply against it."
