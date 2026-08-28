import { describe, expect, it } from 'vitest';
import { listD1MigrateSiteIds } from '../scripts/apply-d1-migrations-all.mjs';

describe('apply-d1-migrations-all', () => {
  it('lists d1:migrate site ids from worker scripts', () => {
    expect(
      listD1MigrateSiteIds({
        'd1:migrate:prod': '...',
        'd1:migrate:test': '...',
        'd1:migrate:demo': '...',
        'd1:migrate:all': '...',
        deploy: '...'
      })
    ).toEqual(['prod', 'demo', 'test']);
  });
});
