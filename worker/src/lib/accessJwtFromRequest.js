/**
 * Cloudflare Access JWT from the incoming request (header or CF_Authorization cookie).
 * Browsers calling same-origin /api via fetch often send only the cookie.
 *
 * @param {Request} request
 * @returns {string | null}
 */
export function readAccessJwtFromRequest(request) {
  const header =
    request.headers.get('Cf-Access-Jwt-Assertion')?.trim() ||
    request.headers.get('cf-access-jwt-assertion')?.trim();
  if (header) return header;

  const raw = request.headers.get('Cookie') ?? '';
  for (const part of raw.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith('CF_Authorization=')) {
      const value = trimmed.slice('CF_Authorization='.length);
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}
