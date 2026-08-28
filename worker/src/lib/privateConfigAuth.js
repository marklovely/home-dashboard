import { authenticateRequest, hasRequiredRole } from './requestAuth.js';
import { resolveAuthenticatedDeviceSession } from './deviceSession.js';
import { getEffectiveSitterAccessState } from './sitterSchedule.js';

/**
 * Owner device mode, or sitter device mode when the owner has enabled secret sharing.
 *
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function requirePrivateConfigAccess(request, env, fetchImpl = fetch) {
  const access = await authenticateRequest(request, env, fetchImpl);
  if (!access.ok) {
    return { ok: false, status: access.status, code: access.code };
  }

  const session = await resolveAuthenticatedDeviceSession(request, env, access);
  if (session.mode !== 'sitter') {
    if (!hasRequiredRole(access, 'owner')) {
      return { ok: false, status: 403, code: 'FORBIDDEN' };
    }
    return { ok: true, access, session };
  }

  const accessState = await getEffectiveSitterAccessState(env);
  if (!accessState.effectiveSecrets) {
    return { ok: false, status: 403, code: 'SITTER_SECRETS_WITHHELD' };
  }

  return { ok: true, access, session };
}
