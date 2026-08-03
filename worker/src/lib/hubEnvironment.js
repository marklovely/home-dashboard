/**
 * @param {Record<string, string | undefined>} env
 */
export function isTestHubWorker(env) {
  return (
    String(env.HUB_ENVIRONMENT ?? '')
      .trim()
      .toLowerCase() === 'test'
  );
}
