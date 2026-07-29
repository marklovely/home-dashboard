/**
 * @param {DurableObjectNamespace | undefined} namespace
 * @param {string} clientKey
 */
function limiterStub(namespace, clientKey) {
  if (!namespace) return null;
  const id = namespace.idFromName(clientKey);
  return namespace.get(id);
}

/**
 * @param {Request} request
 */
export function clientIpFromRequest(request) {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/**
 * @param {Request} request
 * @param {string} email
 * @param {string} buttonCode
 * @param {Record<string, unknown>} env
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
export async function ensureControlActionAllowed(request, email, buttonCode, env) {
  const namespace = /** @type {DurableObjectNamespace | undefined} */ (env.CONTROL_ACTION_LIMITER);
  const ip = clientIpFromRequest(request);
  const stub = limiterStub(namespace, `control:${email}:${ip}`);
  if (!stub) {
    return { allowed: true };
  }

  const response = await stub.fetch('https://control-limiter/attempt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ip, buttonCode, now: Date.now() })
  });

  if (!response.ok) {
    return { allowed: false, reason: 'RATE_LIMITED' };
  }

  const body = await response.json();
  return { allowed: Boolean(body.allowed), reason: body.reason };
}
