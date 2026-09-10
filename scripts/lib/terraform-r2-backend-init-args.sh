#!/usr/bin/env bash
# Shared partial backend config for Terraform remote state on Cloudflare R2.
# Sourced by terraform-init-r2.sh (and migration scripts).
#
# workspace_key_prefix: default "env:" makes Terraform ListObjects on every
# init/plan/apply to discover workspaces. We use separate state keys per stack,
# not workspaces — point prefix at an empty path to keep Class A ops minimal.
# See docs/platform-provision.md and hashicorp/terraform#33958.

# shellcheck disable=SC2034
terraform_r2_backend_init_args=(
  -backend-config="region=auto"
  -backend-config="endpoints={s3=\"${TF_STATE_R2_ENDPOINT}\"}"
  -backend-config="skip_credentials_validation=true"
  -backend-config="skip_metadata_api_check=true"
  -backend-config="skip_region_validation=true"
  -backend-config="skip_requesting_account_id=true"
  -backend-config="skip_s3_checksum=true"
  -backend-config="use_path_style=true"
  -backend-config="workspace_key_prefix=workspaces"
)
