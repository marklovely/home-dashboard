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
 */
export function clientKeyFromRequest(request) {
  const ip =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown';
  return `owner-auth:${ip}`;
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 */
export async function ensureOwnerAuthAllowed(request, env) {
  const namespace = /** @type {DurableObjectNamespace | undefined} */ (env.OWNER_AUTH_LIMITER);
  const stub = limiterStub(namespace, clientKeyFromRequest(request));
  if (!stub) return true;
  return checkAllowed(stub);
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 */
export async function recordOwnerAuthFailure(request, env) {
  const namespace = /** @type {DurableObjectNamespace | undefined} */ (env.OWNER_AUTH_LIMITER);
  const stub = limiterStub(namespace, clientKeyFromRequest(request));
  if (stub) await recordFailure(stub);
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 */
export async function recordOwnerAuthSuccess(request, env) {
  const namespace = /** @type {DurableObjectNamespace | undefined} */ (env.OWNER_AUTH_LIMITER);
  const stub = limiterStub(namespace, clientKeyFromRequest(request));
  if (stub) await recordSuccess(stub);
}
