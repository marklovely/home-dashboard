import { notImplemented } from '../lib/errors.js';

/**
 * Placeholder for future server-side owner authentication.
 * @param {Request} request
 * @param {string} correlationId
 */
export async function handleOwnerAuth(request, correlationId) {
  if (request.method !== 'POST') {
    return notImplemented(correlationId, 'Owner authentication is not available yet.');
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return notImplemented(correlationId, 'Owner authentication is not available yet.');
  }

  if (body && typeof body.pin === 'string') {
    // PIN must never be logged.
  }

  return notImplemented(correlationId, 'Owner authentication is not available yet.');
}
