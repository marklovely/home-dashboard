/**
 * Optional Cloudflare Access service auth for platform → hub health probes.
 * Set PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID + _SECRET on the platform Pages project.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ clientId: string, clientSecret: string } | null}
 */
export function platformHealthServiceAuth(env) {
  const clientId = env.PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID?.trim();
  const clientSecret = env.PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * @param {string} url
 * @param {Record<string, string | undefined>} env
 * @param {RequestInit} [init]
 */
export async function fetchWithPlatformHealthAuth(url, env, init = {}) {
  const auth = platformHealthServiceAuth(env);
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (auth) {
    headers.set('CF-Access-Client-Id', auth.clientId);
    headers.set('CF-Access-Client-Secret', auth.clientSecret);
  }
  return fetch(url, { ...init, headers, redirect: 'manual' });
}

/**
 * @param {Response} response
 * @param {Record<string, string | undefined>} env
 */
export function describeHealthFetchResponse(response, env) {
  if (response.status >= 300 && response.status < 400) {
    return {
      ok: false,
      status: response.status,
      error: 'ACCESS_BLOCKED',
      needsServiceAuth: !platformHealthServiceAuth(env),
      hint: platformHealthServiceAuth(env)
        ? 'Cloudflare Access rejected the platform health service token. Run terraform apply and ensure the token policy is on this site.'
        : 'Hub sites are Access-protected. Run terraform apply (platform_admin) to install the health-check service token.'
    };
  }
  return null;
}
