#!/usr/bin/env bash
# Init Terraform against the split R2 backend for one stack (platform | customers).
# Requires TF_STATE_R2_BUCKET, TF_STATE_R2_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
set -euo pipefail

STACK="${1:-}"
if [[ "${STACK}" != "platform" && "${STACK}" != "customers" ]]; then
  echo "Usage: $0 <platform|customers> [--reconfigure]" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -z "${TF_STATE_R2_BUCKET:-}" || -z "${TF_STATE_R2_ENDPOINT:-}" ]]; then
  echo "::error::Configure TF_STATE_R2_BUCKET and TF_STATE_R2_ENDPOINT. See docs/platform-provision.md" >&2
  exit 1
fi

KEY="$(node "${ROOT}/scripts/terraform-stack-for-site.mjs" --stack "${STACK}" --backend-key)"

init_args=(
  -backend-config="bucket=${TF_STATE_R2_BUCKET}"
  -backend-config="key=${KEY}"
  -backend-config="region=auto"
  -backend-config="endpoints={s3=\"${TF_STATE_R2_ENDPOINT}\"}"
  -backend-config="skip_credentials_validation=true"
  -backend-config="skip_metadata_api_check=true"
  -backend-config="skip_region_validation=true"
  -backend-config="skip_requesting_account_id=true"
  -backend-config="use_path_style=true"
)

if [[ "${2:-}" == "--reconfigure" ]]; then
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
