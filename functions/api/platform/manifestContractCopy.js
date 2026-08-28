export const MANIFEST_CONTRACT_MISSING_MESSAGE =
  "Platform manifest is missing this site's Terraform contract (D1/R2 IDs).";

export const MANIFEST_CONTRACT_MISSING_HINT =
  'The hub may still be live if health checks pass. Rebuild the manifest with terraform output, then redeploy platform admin: npm run platform:manifest && bash scripts/deploy-platform-admin.sh. For a brand-new site, use Provision first.';

/**
 * @returns {{ ok: false, error: 'NO_MANIFEST_CONTRACT', message: string, hint: string }}
 */
export function manifestContractMissingUsageResponse() {
  return {
    ok: false,
    error: 'NO_MANIFEST_CONTRACT',
    message: MANIFEST_CONTRACT_MISSING_MESSAGE,
    hint: MANIFEST_CONTRACT_MISSING_HINT
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} site
 */
export function siteMissingManifestContract(site) {
  return Boolean(site?.terraform) && !site?.contract?.d1_database_id;
}
