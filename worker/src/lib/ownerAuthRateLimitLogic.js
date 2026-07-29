export const OWNER_AUTH_MAX_FAILURES = 5;
export const OWNER_AUTH_WINDOW_MS = 10 * 60 * 1000;

/**
 * @param {number[]} failureTimestamps ms since epoch
 * @param {number} now
 */
export function pruneFailures(failureTimestamps, now) {
  return failureTimestamps.filter((timestamp) => now - timestamp < OWNER_AUTH_WINDOW_MS);
}

/**
 * @param {number[]} failureTimestamps
 * @param {number} [now]
 */
export function isRateLimited(failureTimestamps, now = Date.now()) {
  const recent = pruneFailures(failureTimestamps, now);
  return recent.length >= OWNER_AUTH_MAX_FAILURES;
}
