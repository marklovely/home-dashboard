/**
 * @param {Request} request
 * @param {string} scope
 */
export function clientKeyFromRequest(request, scope) {
  const ip =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown';
  return `${scope}:${ip}`;
}

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
 * @param {DurableObjectStub} stub
 */
async function checkAllowed(stub) {
  const response = await stub.fetch('https://limiter/check', { method: 'GET' });
  if (!response.ok) return false;
  const body = await response.json();
  return Boolean(body.allowed);
}

/**
 * @param {DurableObjectStub} stub
 */
async function recordFailure(stub) {
  await stub.fetch('https://limiter/failure', { method: 'POST' });
}

/**
 * @param {DurableObjectStub} stub
 */
async function recordSuccess(stub) {
  await stub.fetch('https://limiter/success', { method: 'POST' });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} scope
 */
export async function ensureRateLimitAllowed(request, env, scope) {
  const namespace = /** @type {DurableObjectNamespace | undefined} */ (env.OWNER_AUTH_LIMITER);
  const stub = limiterStub(namespace, clientKeyFromRequest(request, scope));
  if (!stub) return true;
  return checkAllowed(stub);
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} scope
 */
export async function recordRateLimitFailure(request, env, scope) {
  const namespace = /** @type {DurableObjectNamespace | undefined} */ (env.OWNER_AUTH_LIMITER);
  const stub = limiterStub(namespace, clientKeyFromRequest(request, scope));
  if (stub) await recordFailure(stub);
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} scope
 */
export async function recordRateLimitSuccess(request, env, scope) {
  const namespace = /** @type {DurableObjectNamespace | undefined} */ (env.OWNER_AUTH_LIMITER);
  const stub = limiterStub(namespace, clientKeyFromRequest(request, scope));
  if (stub) await recordSuccess(stub);
}
