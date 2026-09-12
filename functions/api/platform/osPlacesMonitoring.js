/** @typedef {Record<string, string | undefined>} PlatformEnv */

export const DEFAULT_OS_PLACES_USAGE_BASELINE = 20;
export const DEFAULT_OS_PLACES_TRIAL_END = '2026-11-09';
export const DEFAULT_OS_PLACES_TRIAL_DAYS = 60;

/**
 * @param {PlatformEnv} env
 */
export function resolveOsPlacesUsageBaseline(env) {
  const raw = env.OS_PLACES_USAGE_BASELINE;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return DEFAULT_OS_PLACES_USAGE_BASELINE;
  }
  const baseline = Number(String(raw).trim());
  return Number.isFinite(baseline) && baseline >= 0
    ? baseline
    : DEFAULT_OS_PLACES_USAGE_BASELINE;
}

/**
 * @param {PlatformEnv} env
 * @param {Date} [now]
 */
export function describeOsPlacesTrial(env, now = new Date()) {
  const endsAt = String(env.OS_PLACES_TRIAL_END ?? DEFAULT_OS_PLACES_TRIAL_END).trim();
  if (!endsAt) return null;

  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;

  const trialDaysRaw = Number(env.OS_PLACES_TRIAL_DAYS ?? String(DEFAULT_OS_PLACES_TRIAL_DAYS));
  const trialDays = Number.isFinite(trialDaysRaw) && trialDaysRaw > 0 ? trialDaysRaw : 60;
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));

  return {
    trialDays,
    endsAt: endsAt.slice(0, 10),
    endsLabel: end.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }),
    daysRemaining,
    expired: daysRemaining === 0 && end.getTime() < now.getTime()
  };
}

/**
 * @param {PlatformEnv} env
 * @param {{ lifetimeTotal: number, monthTotal: number }} totals
 */
export function applyOsPlacesUsageBaseline(env, totals) {
  const baseline = resolveOsPlacesUsageBaseline(env);
  return {
    baseline,
    lifetimeTotal: totals.lifetimeTotal + baseline,
    monthTotal: totals.monthTotal + baseline,
    trackedLifetimeTotal: totals.lifetimeTotal,
    trackedMonthTotal: totals.monthTotal
  };
}
