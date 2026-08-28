import {
  clientKeyFromRequest,
  ensureRateLimitAllowed,
  recordRateLimitFailure,
  recordRateLimitSuccess
} from './rateLimitClient.js';

const OWNER_AUTH_SCOPE = 'owner-auth';

/**
 * @param {Request} request
 */
export function clientKeyFromRequestForOwnerAuth(request) {
  return clientKeyFromRequest(request, OWNER_AUTH_SCOPE);
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 */
export async function ensureOwnerAuthAllowed(request, env) {
  return ensureRateLimitAllowed(request, env, OWNER_AUTH_SCOPE);
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 */
export async function recordOwnerAuthFailure(request, env) {
  await recordRateLimitFailure(request, env, OWNER_AUTH_SCOPE);
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 */
export async function recordOwnerAuthSuccess(request, env) {
  await recordRateLimitSuccess(request, env, OWNER_AUTH_SCOPE);
}

/** @deprecated Use clientKeyFromRequestForOwnerAuth */
export { clientKeyFromRequestForOwnerAuth as clientKeyFromRequest };
