/** Vanilla hub Worker stacks (isolated from production home data). */
const VANILLA_HUB_ENVIRONMENTS = new Set(['test', 'staging', 'sandbox']);

/**
 * @param {Record<string, string | undefined>} env
 */
export function isVanillaHubWorker(env) {
  const id = String(env.HUB_ENVIRONMENT ?? '')
    .trim()
    .toLowerCase();
  return VANILLA_HUB_ENVIRONMENTS.has(id);
}

/** @deprecated Prefer isVanillaHubWorker */
export function isTestHubWorker(env) {
  return isVanillaHubWorker(env);
}
