import { describe, expect, it } from 'vitest';
import {
  deployScriptNameForSite,
  listDeploySiteIds
} from '../scripts/deploy-all-workers.mjs';

describe('deploy-all-workers', () => {
  it('lists deploy site ids including prod from bare deploy script', () => {
    expect(
      listDeploySiteIds({
        deploy: 'wrangler deploy',
        'deploy:test': '...',
        'deploy:demo': '...',
        'deploy:all': '...',
        'd1:migrate:test': '...'
      })
    ).toEqual(['prod', 'demo', 'test']);
  });

  it('maps prod to the bare deploy npm script', () => {
    expect(deployScriptNameForSite('prod')).toBe('deploy');
    expect(deployScriptNameForSite('smith')).toBe('deploy:smith');
  });
});
