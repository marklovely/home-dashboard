/**
 * Cloudflare Access–aware fetch defaults for Worker API calls.
 * In production, Cloudflare injects Cf-Access-Jwt-Assertion on requests that pass through Access.
 * Local dev may set VITE_DEV_ACCESS_JWT in .env.local (never commit real tokens).
 *
 * @param {RequestInit} [init]
 */
export function withApiCredentials(init = {}) {
  const headers = new Headers(init.headers);
  const devJwt = import.meta.env.VITE_DEV_ACCESS_JWT;
  if (import.meta.env.DEV && typeof devJwt === 'string' && devJwt.trim()) {
    headers.set('Cf-Access-Jwt-Assertion', devJwt.trim());
  }
  return {
    ...init,
    credentials: 'include',
    headers
  };
}
