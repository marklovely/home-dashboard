export const FREE_TIER_LIMITS = {
  r2StorageBytes: 10 * 1024 ** 3,
  d1StorageBytes: 5 * 1024 ** 3
};

/**
 * @param {number | null | undefined} bytes
 */
export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const digits = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(digits)} ${units[unitIndex]}`;
}

/**
 * @param {number} value
 * @param {number} limit
 */
export function usagePercent(value, limit) {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.min(100, Math.round((value / limit) * 100));
}

/**
 * @param {number} value
 * @param {number} limit
 */
export function usageTone(value, limit) {
  const percent = usagePercent(value, limit);
  if (percent >= 90) return 'bad';
  if (percent >= 70) return 'warn';
  return 'ok';
}

/**
 * @param {number} value
 * @param {number} limit
 */
export function formatUsageLine(value, limit) {
  const percent = usagePercent(value, limit);
  return `${formatBytes(value)} / ${formatBytes(limit)} (${percent}%)`;
}
