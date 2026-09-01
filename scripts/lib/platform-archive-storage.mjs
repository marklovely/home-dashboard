import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Platform R2 bucket for pre-deprovision hub JSON (Terraform: cloudflare_r2_bucket.archives). */
export const PLATFORM_ARCHIVE_R2_BUCKET_NAME = 'lovely-home-hub-archives';

const workerDir = join(dirname(fileURLToPath(import.meta.url)), '../../worker');

/**
 * Wrangler 4 `r2 object put` does not accept `--account-id`. Pass the account via
 * `CLOUDFLARE_ACCOUNT_ID` in the process environment instead.
 *
 * @param {string} objectPath bucket/key
 * @param {string} filePath
 * @returns {string[]}
 */
export function wranglerR2ObjectPutArgs(objectPath, filePath) {
  return ['r2', 'object', 'put', objectPath, '--file', filePath, '--remote'];
}

/**
 * @param {string} objectPath
 * @param {string} filePath
 * @param {string} [accountId]
 */
function putR2Object(objectPath, filePath, accountId) {
  const env = { ...process.env };
  if (accountId?.trim()) {
    env.CLOUDFLARE_ACCOUNT_ID = accountId.trim();
  }
  execFileSync('npx', ['wrangler', ...wranglerR2ObjectPutArgs(objectPath, filePath)], {
    cwd: workerDir,
    stdio: 'inherit',
    env
  });
}

/**
 * @param {string} siteId
 * @param {Record<string, unknown>} payload
 * @param {{ bucket: string, accountId?: string }} options
 * @returns {{ backupKey: string, latestKey: string }}
 */
export function uploadSiteArchiveToR2(siteId, payload, options) {
  const bucket = options.bucket.trim();
  const exportedAt = String(payload.exportedAt ?? payload.archivedAt ?? new Date().toISOString());
  const safeStamp = exportedAt.replace(/[:.]/g, '-');
  const backupKey = `${siteId}/site-backup-${safeStamp}.json`;
  const latestKey = `${siteId}/latest.json`;

  const tempDir = mkdtempSync(join(tmpdir(), 'hub-archive-'));
  const backupPath = join(tempDir, 'site-backup.json');
  const latestPath = join(tempDir, 'latest.json');

  try {
    writeFileSync(backupPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    writeFileSync(
      latestPath,
      `${JSON.stringify(
        {
          siteId,
          formatVersion: payload.formatVersion ?? 1,
          archivedAt: payload.archivedAt ?? exportedAt,
          backupKey,
          backupScope: payload.backupScope ?? 'full'
        },
        null,
        2
      )}\n`,
      'utf8'
    );

    const accountId = options.accountId?.trim();
    putR2Object(`${bucket}/${backupKey}`, backupPath, accountId);
    putR2Object(`${bucket}/${latestKey}`, latestPath, accountId);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  return { backupKey, latestKey };
}
