/**
 * Decide whether a failed Terraform apply/destroy against Cloudflare should be
 * retried. 429s and flaky HTTP are worth waiting on; 403 quota (D1 databases
 * per account) and auth/validation errors are not.
 *
 * @param {string} output combined stdout + stderr
 * @returns {{ retry: boolean, message?: string }}
 */
export function terraformCloudflareRetryDecision(output) {
  const text = String(output ?? '');

  if (/\b401\b.*Unauthorized|Unauthorized.*\b401\b/i.test(text)) {
    return {
      retry: false,
      message:
        'Cloudflare 401 Unauthorized — fix CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID in GitHub secrets (see scripts/verify-cloudflare-api-token.sh)'
    };
  }

  if (/8000022|Invalid Service name \(\)/i.test(text)) {
    return {
      retry: false,
      message:
        'Pages HUB_API binding (8000022). Check terraform/modules/hub_environment/variables.tf entrypoint = "default"'
    };
  }

  if (/Credential access key has length|InvalidArgument.*access key/i.test(text)) {
    return {
      retry: false,
      message:
        'Terraform state backend failed — R2 credentials look wrong. Export Cloudflare R2 API token keys (32-char access key), not AWS IAM keys. See docs/platform-provision.md'
    };
  }

  if (/System limit reached|databases per account \(\d+\)|FreeTierLimitExceeded/i.test(text)) {
    return {
      retry: false,
      message:
        'Cloudflare account limit (e.g. D1 databases per account). This will not succeed on retry'
    };
  }

  if (/\b403\b Forbidden/i.test(text)) {
    return {
      retry: false,
      message: 'Cloudflare 403 Forbidden (quota or permission), not a 429 rate limit'
    };
  }

  if (/application_already_exists|access\.api\.error\.application_already_exists/i.test(text)) {
    return {
      retry: false,
      message: 'Cloudflare Access app already exists — import it into Terraform state instead of retrying create'
    };
  }

  if (
    /\b409\b Conflict/i.test(text) &&
    (/10008|"code"\s*:\s*10008|bucket.*is not empty|not empty \(account/i.test(text))
  ) {
    return {
      retry: false,
      message:
        'Cloudflare R2 bucket is not empty — empty hub R2 buckets before terraform destroy (scripts/empty-hub-site-r2-buckets.mjs)'
    };
  }

  if (/8000076|too many deployments to be deleted/i.test(text)) {
    return {
      retry: false,
      message:
        'Cloudflare Pages project has too many deployments — prune Pages deployments before terraform destroy (scripts/prune-hub-pages-deployments.mjs)'
    };
  }

  if (/\b400\b Bad Request/i.test(text) && !/\b429\b|rate limit/i.test(text)) {
    return { retry: false, message: 'Cloudflare 400 Bad Request' };
  }

  return { retry: true };
}
