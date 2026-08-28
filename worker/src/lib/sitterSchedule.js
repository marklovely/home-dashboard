import { syncSitterEmailsToAccess } from './accessSitterPolicy.js';
import { getSitterAccessEmailsRaw } from './houseSettings.js';
import { getSitterSecretsManual } from './houseSettings.js';
import {
  computeEffectiveSitterEmails,
  computeEffectiveSitterSecrets,
  listSitterStays,
  refreshSitterStayStatuses
} from './sitterStays.js';

/**
 * @param {Record<string, string | undefined>} env
 * @param {number} [nowSec]
 */
export async function getEffectiveSitterAccessState(env, nowSec = Math.floor(Date.now() / 1000)) {
  const manualEmails = (await getSitterAccessEmailsRaw(env)) ?? [];
  const manualSecrets = await getSitterSecretsManual(env);
  const stays = await listSitterStays(env, nowSec);

  return {
    manualEmails,
    manualSecrets,
    stays,
    effectiveEmails: computeEffectiveSitterEmails(manualEmails, stays, nowSec),
    effectiveSecrets: computeEffectiveSitterSecrets(manualSecrets, stays, nowSec)
  };
}

/**
 * Sync Cloudflare Access sitter policy to the scheduled effective email list.
 *
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} [fetchImpl]
 * @param {number} [nowSec]
 */
export async function applySitterStaySchedule(env, fetchImpl = fetch, nowSec = Math.floor(Date.now() / 1000)) {
  if (!env.HOUSE_GUIDE_DB) {
    return { ok: true, skipped: true, reason: 'NO_DB' };
  }

  await refreshSitterStayStatuses(env, nowSec);
  const state = await getEffectiveSitterAccessState(env, nowSec);
  const syncResult = await syncSitterEmailsToAccess(env, state.effectiveEmails, fetchImpl);

  return {
    ok: syncResult.ok,
    syncResult,
    effectiveEmails: state.effectiveEmails,
    effectiveSecrets: state.effectiveSecrets
  };
}
