/**
 * @param {Record<string, string | undefined>} env
 */
export function isVanillaHubWorker(env) {
  const id = String(env.HUB_ENVIRONMENT ?? '')
    .trim()
    .toLowerCase();
  return Boolean(id && id !== 'production' && id !== 'prod');
}

/** @deprecated Prefer isVanillaHubWorker */
export function isTestHubWorker(env) {
  return isVanillaHubWorker(env);
}
