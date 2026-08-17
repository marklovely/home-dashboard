/**
 * @param {Request} request
 * @param {Record<string, unknown>} [env]
 * @returns {Promise<object>}
 */
export async function loadPlatformManifest(request, env = {}) {
  const url = new URL('/platform-manifest.json', request.url);
  const assets = env.ASSETS;
  const response =
    assets && typeof assets === 'object' && 'fetch' in assets && typeof assets.fetch === 'function'
      ? await assets.fetch(url)
      : await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Manifest fetch failed: ${response.status}`);
  }
  return response.json();
}

/**
 * @param {object} manifest
 * @param {string} siteId
 */
export function getSiteFromManifest(manifest, siteId) {
  return manifest.sites?.[siteId] ?? null;
}
