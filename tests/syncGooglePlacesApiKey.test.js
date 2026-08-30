import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listDeploySiteIds } from '../scripts/deploy-all-workers.mjs';
import { loadSitesYaml } from '../scripts/lib/load-sites-yaml.mjs';
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

  it('includes every terraform registry site in worker deploy targets', () => {
    const sites = loadSitesYaml(join(process.cwd(), 'platform/sites.yaml'));
    const workerPkg = JSON.parse(
      readFileSync(join(import.meta.dirname, '../worker/package.json'), 'utf8')
    );
    const siteIds = listDeploySiteIds(workerPkg.scripts ?? {});

    for (const [siteId, entry] of Object.entries(sites)) {
      if (siteId === 'production' || !entry.terraform) continue;
      expect(siteIds, siteId).toContain(siteId);
    }
  });
});
