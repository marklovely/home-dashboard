#!/usr/bin/env bash
# Init Terraform against the split R2 backend for one stack (platform | customers).
# Customer hubs use a per-site key: home-dashboard/customers/{site_id}.tfstate
# Requires TF_STATE_R2_BUCKET, TF_STATE_R2_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
set -euo pipefail

STACK="${1:-}"
if [[ "${STACK}" != "platform" && "${STACK}" != "customers" ]]; then
  echo "Usage: $0 <platform|customers> [site_id] [--reconfigure]" >&2
  exit 1
fi
shift

SITE_ID=""
RECONFIGURE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --reconfigure) RECONFIGURE=1 ;;
    *)
      if [[ -n "${SITE_ID}" ]]; then
        echo "Usage: $0 <platform|customers> [site_id] [--reconfigure]" >&2
        exit 1
      fi
      SITE_ID="$1"
      ;;
  esac
  shift
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -z "${TF_STATE_R2_BUCKET:-}" || -z "${TF_STATE_R2_ENDPOINT:-}" ]]; then
  echo "::error::Configure TF_STATE_R2_BUCKET and TF_STATE_R2_ENDPOINT. See docs/platform-provision.md" >&2
  exit 1
fi

if [[ "${STACK}" == "customers" && -n "${SITE_ID}" ]]; then
  KEY="$(node "${ROOT}/scripts/terraform-stack-for-site.mjs" --stack customers --backend-key --site-id "${SITE_ID}")"
else
  KEY="$(node "${ROOT}/scripts/terraform-stack-for-site.mjs" --stack "${STACK}" --backend-key)"
fi

# shellcheck source=lib/terraform-r2-backend-init-args.sh
source "${ROOT}/scripts/lib/terraform-r2-backend-init-args.sh"

init_args=(
  -backend-config="bucket=${TF_STATE_R2_BUCKET}"
  -backend-config="key=${KEY}"
  "${terraform_r2_backend_init_args[@]}"
)

if [[ -n "${RECONFIGURE}" ]]; then
  init_args+=(-reconfigure)
fi

cd "${ROOT}/terraform"
for attempt in 1 2 3; do
  if terraform init "${init_args[@]}"; then
    exit 0
  fi
  echo "terraform init attempt ${attempt} failed; retrying in 30s..." >&2
  sleep 30
done
echo "terraform init failed after 3 attempts" >&2
exit 1
