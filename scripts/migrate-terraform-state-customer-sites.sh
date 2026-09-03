#!/usr/bin/env bash
# Pull combined customers.tfstate, peel each hub into
# home-dashboard/customers/{siteId}.tfstate, push the new keys.
# Does not delete or overwrite customers.tfstate (backup).
#
# Usage: bash scripts/migrate-terraform-state-customer-sites.sh split-sites
set -euo pipefail

if [[ "${1:-}" != "split-sites" ]]; then
  echo "Refusing to migrate — pass split-sites as the first argument." >&2
  echo "Usage: bash scripts/migrate-terraform-state-customer-sites.sh split-sites" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/tf-customer-sites.XXXXXX")"
trap 'rm -rf "${WORK}"' EXIT

if [[ -z "${TF_STATE_R2_BUCKET:-}" || -z "${TF_STATE_R2_ENDPOINT:-}" ]]; then
  echo "Set TF_STATE_R2_BUCKET and TF_STATE_R2_ENDPOINT." >&2
  exit 1
fi

state_is_empty() {
  local list
  list="$(terraform -chdir="${ROOT}/terraform" state list 2>/dev/null || true)"
  [[ -z "${list}" ]]
}

echo "==> Init combined customers.tfstate (read-only source)"
bash "${ROOT}/scripts/terraform-init-r2.sh" customers --reconfigure
terraform -chdir="${ROOT}/terraform" state pull > "${WORK}/customers.tfstate.json"
if ! grep -q '"resources"' "${WORK}/customers.tfstate.json"; then
  echo "customers.tfstate pull did not look like Terraform state JSON." >&2
  exit 1
fi

COMBINED_LIST="$(terraform -chdir="${ROOT}/terraform" state list 2>/dev/null || true)"
if [[ -z "${COMBINED_LIST}" ]]; then
  echo "Combined customers.tfstate is empty — per-site split already ran or there are no customer hubs."
  exit 0
fi

echo "==> Split combined customers state"
node "${ROOT}/scripts/migrate-terraform-state-customer-sites.mjs" \
  --input "${WORK}/customers.tfstate.json" \
  --out-dir "${WORK}/sites"

shopt -s nullglob
SITE_FILES=("${WORK}/sites"/*.tfstate.json)
if [[ "${#SITE_FILES[@]}" -eq 0 ]]; then
  echo "Split produced no per-site files." >&2
  exit 1
fi

for site_file in "${SITE_FILES[@]}"; do
  site_id="$(basename "${site_file}" .tfstate.json)"
  echo "==> Push customers/${site_id}.tfstate"
  bash "${ROOT}/scripts/terraform-init-r2.sh" customers "${site_id}" --reconfigure
  if ! state_is_empty; then
    echo "customers/${site_id}.tfstate already has resources — leaving it in place."
    continue
  fi
  terraform -chdir="${ROOT}/terraform" state push -force "${site_file}"
  node "${ROOT}/scripts/assert-terraform-stack-state.mjs" customers "${site_id}"
done

echo "Per-site customer state split complete. Leave home-dashboard/customers.tfstate in R2 as a backup — do not apply against it."
