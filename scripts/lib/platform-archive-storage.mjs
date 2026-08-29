import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

    const wranglerArgs = ['r2', 'object', 'put'];
    if (options.accountId?.trim()) {
      wranglerArgs.push('--account-id', options.accountId.trim());
    }
    wranglerArgs.push(`${bucket}/${backupKey}`, '--file', backupPath, '--remote');
    execFileSync('npx', ['wrangler', ...wranglerArgs], { stdio: 'inherit' });

    const latestArgs = ['r2', 'object', 'put'];
    if (options.accountId?.trim()) {
      latestArgs.push('--account-id', options.accountId.trim());
    }
    latestArgs.push(`${bucket}/${latestKey}`, '--file', latestPath, '--remote');
    execFileSync('npx', ['wrangler', ...latestArgs], { stdio: 'inherit' });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  return { backupKey, latestKey };
}
