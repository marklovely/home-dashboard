/**
 * Normalise CF_ACCESS_TEAM_DOMAIN — accepts team slug or full hostname.
 *
 * @param {string | undefined} raw
 * @returns {string | null} e.g. mark-lovely67
 */
export function accessTeamSlug(raw) {
  let value = raw?.trim();
  if (!value) return null;

  if (value.startsWith('https://')) value = value.slice('https://'.length);
  else if (value.startsWith('http://')) value = value.slice('http://'.length);

  value = value.replace(/\/$/, '');
  if (value.endsWith('.cloudflareaccess.com')) {
    value = value.slice(0, -'.cloudflareaccess.com'.length);
  }

  return value || null;
}

/**
 * @param {string | undefined} raw
 * @returns {string | null} e.g. https://mark-lovely67.cloudflareaccess.com
 */
export function accessTeamOrigin(raw) {
  const slug = accessTeamSlug(raw);
  return slug ? `https://${slug}.cloudflareaccess.com` : null;
}
