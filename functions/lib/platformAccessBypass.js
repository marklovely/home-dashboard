/**
 * Paths on the platform Pages project that skip Cloudflare Access middleware.
 * Zero Trust also needs matching bypass apps in terraform (see platform_admin/access.tf).
 *
 * @param {string} pathname
 * @param {Record<string, string | undefined>} env
 */
export function shouldBypassPlatformAccess(pathname, env) {
  const operatorsConfigured = Boolean(env.PLATFORM_OPERATOR_EMAILS?.trim());

  if (pathname === '/api/stripe/webhook') {
    return operatorsConfigured;
  }

  if (pathname.startsWith('/api/public/')) {
    return operatorsConfigured || isPublicSignupEnabled(env);
  }

  return false;
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function isPublicSignupEnabled(env) {
  const enabled = String(env.PUBLIC_SIGNUP_ENABLED ?? '').trim().toLowerCase();
  return enabled === '1' || enabled === 'true' || enabled === 'yes';
}
