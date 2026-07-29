const mediaModules = import.meta.glob('../media/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default'
});

/**
 * @param {string} fileName
 * @returns {string | undefined}
 */
export function resolveGuideMediaUrl(fileName) {
  const entry = Object.entries(mediaModules).find(([path]) => path.endsWith(`/${fileName}`));
  return entry ? /** @type {string} */ (entry[1]) : undefined;
}

/**
 * @param {string} mediaId
 * @param {Record<string, { file: string, alt: string }>} catalogMedia
 */
export function resolveGuideMediaById(mediaId, catalogMedia) {
  const asset = catalogMedia[mediaId];
  if (!asset) return undefined;
  const url = resolveGuideMediaUrl(asset.file);
  if (!url) return undefined;
  return { url, alt: asset.alt };
}
