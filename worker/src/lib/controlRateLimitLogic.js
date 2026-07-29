export const CONTROL_MAX_PER_MINUTE = 10;
export const CONTROL_DUPLICATE_COOLDOWN_MS = 2000;
const WINDOW_MS = 60_000;

/**
 * @param {number[]} timestamps
 * @param {number} now
 */
export function pruneTimestamps(timestamps, now) {
  const cutoff = now - WINDOW_MS;
  return timestamps.filter((value) => value >= cutoff);
}

/**
 * @param {number[]} timestamps
 * @param {number} now
 */
export function isOverRateLimit(timestamps, now) {
  return pruneTimestamps(timestamps, now).length >= CONTROL_MAX_PER_MINUTE;
}

/**
 * @param {number | undefined} lastTriggeredAt
 * @param {number} now
 */
export function isDuplicateCooldown(lastTriggeredAt, now) {
  if (typeof lastTriggeredAt !== 'number') return false;
  return now - lastTriggeredAt < CONTROL_DUPLICATE_COOLDOWN_MS;
}
