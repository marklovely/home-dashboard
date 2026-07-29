/** @typedef {'owner' | 'house-sitter'} LovelyHomeRole */

/**
 * @param {string | undefined} csv
 */
export function parseOwnerEmails(csv) {
  if (!csv?.trim()) return new Set();
  return new Set(
    csv
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * @param {string | undefined} email
 */
export function normalizeEmail(email) {
  return email?.trim().toLowerCase() ?? '';
}

/**
 * @param {string} email
 * @param {Record<string, string | undefined>} env
 * @returns {LovelyHomeRole}
 */
export function resolveRoleFromEmail(email, env) {
  const normalized = normalizeEmail(email);
  if (!normalized) return 'house-sitter';
  const owners = parseOwnerEmails(env.OWNER_EMAILS);
  if (owners.has(normalized)) return 'owner';
  return 'house-sitter';
}
