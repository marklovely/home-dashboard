/**
 * Parse the site id from an automated platform registry PR title.
 *
 * @param {string} title
 * @returns {string | null}
 */
export function siteIdFromPlatformPrTitle(title) {
  const text = String(title ?? '').trim();
  const patterns = [
    /^platform: billing deprovision ([a-z0-9-]+)$/,
    /^platform: (?:create|update|delete) site ([a-z0-9-]+)$/,
    /^platform: mark ([a-z0-9-]+) provisioned\b/,
    /^platform: drop ([a-z0-9-]+) contract\b/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}
