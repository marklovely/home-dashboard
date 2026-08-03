import { normalizeAppleCalendarFeedUrl } from '../calendar/feedUrl.js';
import { getHubSecret } from './hubSecrets.js';

/**
 * @param {Record<string, string | undefined>} env
 */
export async function getConfiguredCalendarFeedRaw(env) {
  const fromDb = await getHubSecret(env, 'calendar_ics_url');
  if (fromDb) return fromDb;
  return env.APPLE_CALENDAR_ICS_URL?.trim() || '';
}

/**
 * @param {Record<string, string | undefined>} env
 */
export async function getConfiguredCalendarFeedUrl(env) {
  const raw = await getConfiguredCalendarFeedRaw(env);
  return normalizeAppleCalendarFeedUrl(raw);
}

/**
 * @param {Record<string, string | undefined>} env
 */
export async function isCalendarFeedConfigured(env) {
  return Boolean((await getConfiguredCalendarFeedRaw(env)).trim());
}
