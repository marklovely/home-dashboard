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
 * @returns {string | undefined}
 */
export function hubProxySecretForGeneratedTfvars(
  siteId,
  terraformSiteIds,
  randomProxySiteIds,
  envSecrets,
  stateSecrets
) {
  const fromEnv = envSecrets[siteId]?.trim();
  if (fromEnv) return fromEnv;

  if (randomProxySiteIds.has(siteId)) {
    return undefined;
  }

  if (terraformSiteIds.has(siteId)) {
    const fromState = stateSecrets[siteId]?.trim();
    if (!fromState) {
      throw new Error(
        `Missing hub_proxy_secret for in-state site "${siteId}". ` +
          'Ensure terraform output is readable or add the site to HUB_PROXY_SECRETS_JSON.'
      );
    }
    return fromState;
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
