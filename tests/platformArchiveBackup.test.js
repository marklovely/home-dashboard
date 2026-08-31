import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLATFORM_ARCHIVE_R2_BUCKET_NAME } from '../scripts/lib/platform-archive-storage.mjs';
import { parsePlatformHealthServiceTokenFromState } from '../scripts/lib/platform-archive-github-secrets.mjs';

describe('platform archive bucket name', () => {
  it('matches the Terraform R2 bucket resource', () => {
    const tf = readFileSync(join(process.cwd(), 'terraform/modules/platform_admin/r2.tf'), 'utf8');
    expect(tf).toContain(`name       = "${PLATFORM_ARCHIVE_R2_BUCKET_NAME}"`);
  });
});

describe('archive-hub-site-backup', () => {
  it('refuses to run without PLATFORM_SITE_ARCHIVE_SECRET', () => {
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/archive-hub-site-backup.mjs'), 'rosies'],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PLATFORM_SITE_ARCHIVE_SECRET: '',
          PLATFORM_ARCHIVE_R2_BUCKET: PLATFORM_ARCHIVE_R2_BUCKET_NAME
        }
      }
    );
    expect(result.status).toBe(1);
    expect(`${result.stderr}${result.stdout}`).toMatch(/PLATFORM_SITE_ARCHIVE_SECRET/);
  });
});

describe('parsePlatformHealthServiceTokenFromState', () => {
  it('reads client id and secret from platform_admin state JSON', () => {
    const parsed = parsePlatformHealthServiceTokenFromState(
      JSON.stringify({
        resources: [
          {
            module: 'module.platform_admin[0]',
            type: 'cloudflare_zero_trust_access_service_token',
            name: 'platform_health',
            instances: [{ attributes: { client_id: 'cid', client_secret: 'sec' } }]
          }
        ]
      })
    );
    expect(parsed).toEqual({ clientId: 'cid', clientSecret: 'sec' });
  });

  it('returns null when the token is missing', () => {
    expect(parsePlatformHealthServiceTokenFromState('{}')).toBeNull();
    expect(parsePlatformHealthServiceTokenFromState('not-json')).toBeNull();
  });
});
