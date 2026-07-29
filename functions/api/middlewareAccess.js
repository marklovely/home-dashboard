/**
 * @param {unknown} data
 * @returns {string | null}
 */
export function middlewareAccessEmail(data) {
  if (!data || typeof data !== 'object') return null;
  const access = /** @type {{ cloudflareAccess?: { JWT?: { payload?: { email?: string } } } } } */ (data);
  const email = access.cloudflareAccess?.JWT?.payload?.email;
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
}

/**
 * @param {unknown} data
 */
export function middlewareAccessValidated(data) {
  if (!data || typeof data !== 'object') return false;
  const access = /** @type {{ cloudflareAccess?: { JWT?: { payload?: unknown } } } } */ (data);
  return Boolean(access.cloudflareAccess?.JWT?.payload);
}
