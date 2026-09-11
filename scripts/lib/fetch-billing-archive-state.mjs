import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * @param {string} siteId
 * @param {{ databaseName?: string, cwd?: string }} [options]
 * @returns {{ archiveR2Key: string | null, archiveRestoredAt: number | null } | null}
 */
export function fetchBillingArchiveState(siteId, options = {}) {
  const id = String(siteId ?? '').trim();
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(id)) {
    throw new Error('fetchBillingArchiveState requires a valid site_id.');
  }

  const databaseName = options.databaseName?.trim() || 'lovely-home-platform-billing';
  const cwd = options.cwd ?? root;
  const escaped = id.replace(/'/g, "''");

  let stdout;
  try {
    stdout = execFileSync(
      'npx',
      [
        'wrangler',
        'd1',
        'execute',
        databaseName,
        '--remote',
        '--yes',
        '--json',
        '--command',
        `SELECT archive_r2_key, archive_restored_at FROM site_billing WHERE site_id = '${escaped}' LIMIT 1`
      ],
      { cwd, encoding: 'utf8' }
    );
  } catch {
    return null;
  }

  const payload = JSON.parse(stdout);
  const row = Array.isArray(payload) ? payload[0]?.results?.[0] : payload?.results?.[0];
  if (!row) return null;

  const archiveR2Key = String(row.archive_r2_key ?? '').trim() || null;
  const restoredRaw = row.archive_restored_at;
  const archiveRestoredAt =
    restoredRaw === null || restoredRaw === undefined || restoredRaw === ''
      ? null
      : Number(restoredRaw);

  return {
    archiveR2Key,
    archiveRestoredAt: Number.isFinite(archiveRestoredAt) ? archiveRestoredAt : null
  };
}
