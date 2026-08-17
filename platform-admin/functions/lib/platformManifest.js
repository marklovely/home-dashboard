/**
 * @param {Request} request
 * @returns {Promise<object>}
 */
export async function loadPlatformManifest(request) {
  const url = new URL('/platform-manifest.json', request.url);
  const response = await fetch(url.toString(), { cache: 'no-store' });
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
