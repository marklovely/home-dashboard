/** Demo hub identity used when public username/password auth is enabled. */
export const DEMO_AUTH_EMAIL = 'demo@lovely-home.co.uk';

/**
 * @param {Record<string, string | undefined>} env
 */
export function isDemoHubWorker(env) {
  return String(env.HUB_ENVIRONMENT ?? '').trim().toLowerCase() === 'demo';
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function isDemoAuthEnabled(env) {
  return isDemoHubWorker(env) && env.DEMO_AUTH_ENABLED === 'true';
}

/**
 * @param {string} correlationId
 */
export function demoMutationsBlockedResponse(correlationId) {
  return Response.json(
    {
      error: {
        code: 'DEMO_READ_ONLY',
        message: 'This action is disabled on the public demo hub.',
        correlationId
      }
    },
    { status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  );
}

/**
 * @param {Date} [date]
 */
export function getLondonDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}
