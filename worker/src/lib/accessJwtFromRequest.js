/**
 * Cloudflare Access JWT from the incoming request (header or CF_Authorization cookie).
 *
 * @param {Request} request
 * @returns {string | null}
 */
export function readAccessJwtFromRequest(request) {
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase() === 'cf-access-jwt-assertion' && value?.trim()) {
      return value.trim();
    }
  }

  const raw = request.headers.get('Cookie') ?? '';
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    if (name.toLowerCase() !== 'cf_authorization') continue;
    let value = part.slice(eq + 1).trim();
    if (!value) return null;
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.includes('%')) {
      try {
        value = decodeURIComponent(value);
      } catch {
        /* use raw */
      }
    }
    return value;
  }

  return null;
}
