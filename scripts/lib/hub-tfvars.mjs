/**
 * Shared helpers for generate-hub-tfvars.mjs
 */

/**
 * @param {string} siteId
 * @param {Record<string, string | boolean>} meta
 * @param {Set<string>} terraformSiteIds
 * @param {{ provisionSiteId?: string, provisionPhase?: string }} [options]
 */
export function resolveAttachHubApiBinding(siteId, meta, terraformSiteIds, options = {}) {
  const provisionSiteId = options.provisionSiteId?.trim() || '';
  const provisionPhase = options.provisionPhase?.trim() || '';

  if (siteId === provisionSiteId) {
    if (provisionPhase === 'pre-worker') return false;
    if (provisionPhase === 'post-worker') return true;
  }

  if (meta.attach_hub_api_binding === true) return true;
  if (meta.attach_hub_api_binding === false) return false;

  return terraformSiteIds.has(siteId);
}

/**
 * @param {string} siteId
 * @param {Record<string, string | boolean>} meta
 * @param {Set<string>} terraformSiteIds
 * @param {{ provisionSiteId?: string, provisionPhase?: string }} [options]
 */
export function resolveIncludePagesDevAccessDestinations(siteId, meta, terraformSiteIds, options = {}) {
  void terraformSiteIds;
  const provisionSiteId = options.provisionSiteId?.trim() || '';
  const provisionPhase = options.provisionPhase?.trim() || '';

  if (siteId === provisionSiteId) {
    if (provisionPhase === 'pre-worker') return false;
    if (provisionPhase === 'post-worker') return true;
  }

  if (meta.include_pages_dev_access_destinations === false) return false;
  if (meta.include_pages_dev_access_destinations === true) return true;

  return true;
}

/**
 * @param {string} siteId
 * @param {Set<string>} terraformSiteIds
 * @param {Record<string, string>} envSecrets
 * @param {Record<string, string>} stateSecrets
 * @returns {string | null}
 */
export function resolveHubProxySecret(siteId, terraformSiteIds, envSecrets, stateSecrets) {
  const fromEnv = envSecrets[siteId]?.trim();
  if (fromEnv) return fromEnv;

  const fromState = stateSecrets[siteId]?.trim();
  if (fromState) return fromState;

  if (terraformSiteIds.has(siteId)) {
    return null;
  }

  return null;
}

/**
 * Secret value for hub.generated.secrets.tfvars.json during CI provision.
 * Skips random_password-managed sites (e.g. sandbox) so full/state reads do not
 * flip them to explicit secrets and destroy random_password on apply.
 *
 * @param {string} siteId
 * @param {Set<string>} terraformSiteIds
 * @param {Set<string>} randomProxySiteIds
 * @param {Record<string, string>} envSecrets
 * @param {Record<string, string>} stateSecrets
 * @param {string} [applySiteId] Site Terraform will `-target` (provision or deprovision)
 * @returns {string | undefined}
 */
export function hubProxySecretForGeneratedTfvars(
  siteId,
  terraformSiteIds,
  randomProxySiteIds,
  envSecrets,
  stateSecrets,
  applySiteId = ''
) {
  const fromEnv = envSecrets[siteId]?.trim();
  if (fromEnv) return fromEnv;

  if (randomProxySiteIds.has(siteId)) {
    return undefined;
  }

  if (terraformSiteIds.has(siteId)) {
    const fromState = stateSecrets[siteId]?.trim();
    if (fromState) return fromState;
    const target = String(applySiteId ?? '').trim();
    // Targeted apply does not touch other modules. Production was imported with
    // a locally pinned secret that is not in HUB_PROXY_SECRETS_JSON; requiring
    // it here blocked every new customer hub.
    if (target && siteId !== target) {
      return undefined;
    }
    const known = [...new Set([...Object.keys(envSecrets), ...Object.keys(stateSecrets)])]
      .sort()
      .join(', ');
    throw new Error(
      `Missing hub_proxy_secret for in-state site "${siteId}". ` +
        `Readable secret keys: ${known || '(none)'}. ` +
        'Ensure terraform output is readable or add the site to HUB_PROXY_SECRETS_JSON.'
    );
  }

  return undefined;
}

/**
 * @param {string} siteId
 * @param {Set<string>} terraformSiteIds
 * @param {Record<string, string>} envSecrets
 * @param {Record<string, string>} stateSecrets
 */
export function requireHubProxySecret(siteId, terraformSiteIds, envSecrets, stateSecrets) {
  const secret = resolveHubProxySecret(siteId, terraformSiteIds, envSecrets, stateSecrets);
  if (secret) return secret;

  if (terraformSiteIds.has(siteId)) {
    throw new Error(
      `Missing hub_proxy_secret for in-state site "${siteId}". ` +
        'Ensure terraform output is readable or add the site to HUB_PROXY_SECRETS_JSON.'
    );
  }

  return null;
}

/**
 * @param {string} value
 */
export function escapeHcl(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * @param {string} deprovisionSiteId
 * @param {Set<string>} writtenSiteIds
 * @returns {string | null}
 */
export function deprovisionSiteMissingError(deprovisionSiteId, writtenSiteIds) {
  const siteId = deprovisionSiteId?.trim();
  if (!siteId || writtenSiteIds.has(siteId)) return null;
  return (
    `DEPROVISION_SITE_ID="${siteId}" must appear in generated tfvars but could not be resolved from terraform output.`
  );
}
