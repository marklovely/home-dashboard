import { getR2ObjectText } from './cloudflare-r2-api.mjs';

const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @param {string} siteId
 * @param {{ bucket: string, accountId: string, token: string, maxAgeMs?: number }} options
 * @returns {Promise<{ backupKey: string, latestKey: string, archivedAt: string } | null>}
 */
export async function readRecentSiteArchivePointer(siteId, options) {
  const accountId = options.accountId?.trim();
  const token = options.token?.trim();
  const bucket = options.bucket?.trim();
  if (!accountId || !token || !bucket) return null;

  const latestKey = `${siteId}/latest.json`;
  let raw;
  try {
    raw = await getR2ObjectText(bucket, latestKey, { accountId, token });
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const backupKey = String(parsed?.backupKey ?? '').trim();
  const archivedAt = String(parsed?.archivedAt ?? '').trim();
  if (!backupKey || !archivedAt) return null;

  const archivedMs = Date.parse(archivedAt);
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  if (!Number.isFinite(archivedMs) || Date.now() - archivedMs > maxAgeMs) {
    return null;
  }

  return { backupKey, latestKey, archivedAt };
}
