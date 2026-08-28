/**
 * @param {Record<string, unknown>} env
 */
export function isPublicDemoHub(env) {
  return env.DEMO_PUBLIC === 'true' || env.VITE_HUB_ENVIRONMENT === 'demo';
}
