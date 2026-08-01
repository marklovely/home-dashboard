import { requireOwnerDeviceMode, requireOwnerIdentity } from './deviceSessionAuth.js';
import { getSiteProfile, hasSiteProfileRow } from './siteProfile.js';
import { isHouseGuideSeeded } from '../houseGuide/repository.js';

/**
 * @param {Record<string, string | undefined>} env
 */
export async function isHubOnboardingComplete(env) {
  const profile = await getSiteProfile(env);
  const hasProfile = await hasSiteProfileRow(env);
  if (!hasProfile && env.HOUSE_GUIDE_DB && (await isHouseGuideSeeded(env.HOUSE_GUIDE_DB))) {
    return true;
  }
  return profile.onboardingComplete === true;
}

/**
 * @param {unknown} error
 */
function mapSetupDbError(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/no such table|SQLITE_ERROR|D1_ERROR/i.test(message)) {
    return { ok: false, status: 503, code: 'SETUP_DB_NOT_MIGRATED' };
  }
  throw error;
}

/**
 * Owner identity is always required. Sitter device cookies are allowed until onboarding is complete.
 *
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} [fetchImpl]
 */
export async function requireOwnerForHubSetup(request, env, fetchImpl = fetch) {
  const identity = await requireOwnerIdentity(request, env, fetchImpl);
  if (!identity.ok) return identity;

  try {
    if (!(await isHubOnboardingComplete(env))) {
      return { ok: true, auth: identity.auth };
    }
  } catch (error) {
    return mapSetupDbError(error);
  }

  return requireOwnerDeviceMode(request, env);
}
