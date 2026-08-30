import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listDeploySiteIds } from '../scripts/deploy-all-workers.mjs';
import {
  parseSyncArchiveSecretArgs,
  resolveSyncArchiveSecretTargets
} from '../scripts/sync-platform-site-archive-secret.mjs';

describe('sync-google-places-api-key', () => {
  it('defaults to all deploy sites', () => {
    const scripts = { deploy: 'x', 'deploy:test': 'x', 'deploy:practice': 'x' };
    expect(resolveSyncArchiveSecretTargets(scripts)).toEqual(['prod', 'practice', 'test']);
  });

  it('parses site filters', () => {
    expect(parseSyncArchiveSecretArgs(['--site', 'practice', '--dry-run'])).toEqual({
      dryRun: true,
      continueOnError: false,
      sites: ['practice'],
      exclude: new Set()
    });
  });

  it('includes practice in worker deploy targets', () => {
    const workerPkg = JSON.parse(
      readFileSync(join(import.meta.dirname, '../worker/package.json'), 'utf8')
    );
    const siteIds = listDeploySiteIds(workerPkg.scripts ?? {});
    expect(siteIds).toContain('practice');
  });
});
