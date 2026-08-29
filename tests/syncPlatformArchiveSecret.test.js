import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listDeploySiteIds } from '../scripts/deploy-all-workers.mjs';
import { wranglerEnvFromDeploySiteId } from '../scripts/lib/worker-secret-put.mjs';
import {
  parseSyncArchiveSecretArgs,
  resolveSyncArchiveSecretTargets
} from '../scripts/sync-platform-site-archive-secret.mjs';

describe('sync-platform-site-archive-secret', () => {
  it('maps prod deploy script to default Worker (no wrangler env)', () => {
    expect(wranglerEnvFromDeploySiteId('prod')).toBeNull();
    expect(wranglerEnvFromDeploySiteId('smith')).toBe('smith');
  });

  it('defaults to all deploy sites except excluded', () => {
    const scripts = { deploy: 'x', 'deploy:test': 'x', 'deploy:smith': 'x' };
    expect(resolveSyncArchiveSecretTargets(scripts)).toEqual(['prod', 'smith', 'test']);
    expect(resolveSyncArchiveSecretTargets(scripts, { exclude: new Set(['prod']) })).toEqual([
      'smith',
      'test'
    ]);
  });

  it('parses site filters', () => {
    expect(parseSyncArchiveSecretArgs(['--site', 'smith', '--dry-run'])).toEqual({
      dryRun: true,
      continueOnError: false,
      sites: ['smith'],
      exclude: new Set()
    });
  });

  it('includes every wrangler deploy env from worker package', () => {
    const workerPkg = JSON.parse(
      readFileSync(join(import.meta.dirname, '../worker/package.json'), 'utf8')
    );
    const siteIds = listDeploySiteIds(workerPkg.scripts ?? {});
    expect(siteIds.length).toBeGreaterThan(0);
    expect(siteIds).toContain('prod');
  });
});
