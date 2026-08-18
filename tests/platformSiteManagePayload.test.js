import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

describe('platform-site-manage args', () => {
  it('parses empty --sitter-emails without coercing to boolean true', () => {
    const result = spawnSync(
      process.execPath,
      [
        join(process.cwd(), 'scripts/platform-site-manage.mjs'),
        'create',
        '--site-id',
        'zzpayloadtest',
        '--hostname',
        'zzpayloadtest.lovely-home.co.uk',
        '--hub-environment',
        'zzpayloadtest',
        '--vanilla',
        'true',
        '--terraform',
        'true',
        '--owner-emails',
        'owner@example.com',
        '--sitter-emails',
        '',
        '--dry-run'
      ],
      { encoding: 'utf8' }
    );

    expect(result.stderr).not.toMatch(/Invalid email address: true/i);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/"ok": true/);
  });
});
