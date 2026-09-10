import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveSiteArchiveContract } from '../scripts/lib/resolve-site-archive-contract.mjs';

const root = join(import.meta.dirname, '..');

describe('readSiteContract process lifecycle', () => {
  it('resolve-site-archive-contract does not shell out to terraform-site-output.mjs', () => {
    const source = readFileSync(
      join(root, 'scripts/lib/resolve-site-archive-contract.mjs'),
      'utf8'
    );
    expect(source).not.toMatch(/execFileSync\(\s*['"]node['"]/);
    expect(source).not.toMatch(/spawn\(\s*['"]node['"]/);
  });

  it('resolveSiteArchiveContract resolves e2e slugs without subprocesses', () => {
    const resolved = resolveSiteArchiveContract('e2e-process-check');
    expect(resolved?.source).toBe('convention');
    expect(resolved?.site.hostname).toBe('e2e-process-check.lovely-hub.com');
  });
});
