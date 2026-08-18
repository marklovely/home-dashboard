import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

describe('platform-site-manage-from-payload', () => {
  it('accepts empty sitter_emails without treating terraform as an email', () => {
    const payload = JSON.stringify({
      siteId: 'demo',
      hostname: 'demo.lovely-home.co.uk',
      hub_environment: 'demo',
      vanilla: true,
      attach_hub_api_binding: false,
      owner_emails: ['marklovely67@gmail.com'],
      sitter_emails: [],
      terraform: true
    });

    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/platform-site-manage-from-payload.mjs')],
      {
        env: {
          ...process.env,
          SITE_MANAGE_ACTION: 'create',
          SITE_MANAGE_PAYLOAD: payload
        },
        encoding: 'utf8'
      }
    );

    expect(result.stderr).not.toMatch(/Invalid email address: true/i);
    expect(result.status).toBe(0);
  });
});
