import { timingSafeEqualString } from './timingSafeEqual.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export function verifyHubAdminBearer(request, env) {
  const secret = env.HUB_PROXY_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get('Authorization') ?? '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token) return false;

  return timingSafeEqualString(token, secret);
}
