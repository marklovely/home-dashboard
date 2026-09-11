const USAGE_KEY = 'third_party_api_usage';

/**
 * @typedef {{ osPlaces: { lifetime: number, month: string, monthCalls: number } }} ThirdPartyApiUsage
 */

/**
 * @returns {ThirdPartyApiUsage}
 */
export function emptyThirdPartyApiUsage() {
  return {
    osPlaces: {
      lifetime: 0,
      month: currentUsageMonth(),
      monthCalls: 0
    }
  };
}

/**
 * @param {Date} [now]
 */
export function currentUsageMonth(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

/**
 * @param {unknown} raw
 * @returns {ThirdPartyApiUsage}
 */
export function parseThirdPartyApiUsage(raw) {
  if (!raw) return emptyThirdPartyApiUsage();
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const osPlaces = parsed?.osPlaces ?? {};
    return {
      osPlaces: {
        lifetime: Number(osPlaces.lifetime) || 0,
        month: String(osPlaces.month ?? currentUsageMonth()),
        monthCalls: Number(osPlaces.monthCalls) || 0
      }
    };
  } catch {
    return emptyThirdPartyApiUsage();
  }
}

/**
 * @param {ThirdPartyApiUsage} usage
 * @param {number} [count]
 * @param {Date} [now]
 */
export function incrementOsPlacesUsage(usage, count = 1, now = new Date()) {
  const month = currentUsageMonth(now);
  const next = {
    osPlaces: {
      lifetime: usage.osPlaces.lifetime + count,
      month,
      monthCalls: usage.osPlaces.month === month ? usage.osPlaces.monthCalls + count : count
    }
  };
  return next;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {number} [count]
 */
export async function recordOsPlacesApiCall(env, count = 1) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) return;

  const row = await db.prepare('SELECT value FROM house_settings WHERE key = ?').bind(USAGE_KEY).first();
  const usage = incrementOsPlacesUsage(parseThirdPartyApiUsage(row?.value), count);
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO house_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(USAGE_KEY, JSON.stringify(usage), now)
    .run();
}

/**
 * @param {Record<string, string | undefined>} env
 */
export async function getThirdPartyApiUsage(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) {
    return emptyThirdPartyApiUsage();
  }

  const row = await db.prepare('SELECT value FROM house_settings WHERE key = ?').bind(USAGE_KEY).first();
  return parseThirdPartyApiUsage(row?.value);
}
