import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyLocalHubEnv,
  missingProvisionEnvKeys,
  parseHubTfvarsText
} from '../scripts/lib/load-local-hub-env.mjs';

describe('load-local-hub-env', () => {
  it('parses string fields and email lists from hub.tfvars text', () => {
    const parsed = parseHubTfvarsText(`
cloudflare_account_id = "acc-123"
workers_subdomain     = "mark-lovely67"
access_team_domain    = "lovely-home"
owner_emails = [
  "owner@example.com",
]
platform_operator_emails = [
  "ops@example.com",
]
`);

    expect(parsed.strings.cloudflare_account_id).toBe('acc-123');
    expect(parsed.strings.workers_subdomain).toBe('mark-lovely67');
    expect(parsed.lists.owner_emails).toEqual(['owner@example.com']);
    expect(parsed.lists.platform_operator_emails).toEqual(['ops@example.com']);
  });

  it('applies values from hub.tfvars without overriding existing exports', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hub-env-'));
    const path = join(dir, 'hub.tfvars');
    writeFileSync(
      path,
      `
cloudflare_account_id = "acc-123"
cloudflare_zone_id = "zone-456"
workers_subdomain = "from-file"
access_team_domain = "lovely-home"
owner_emails = ["owner@example.com"]
platform_operator_emails = ["ops@example.com"]
`
    );

    /** @type {NodeJS.ProcessEnv} */
    const env = { WORKERS_SUBDOMAIN: 'already-set' };
    expect(applyLocalHubEnv(path, env)).toBe(true);
    expect(env.WORKERS_SUBDOMAIN).toBe('already-set');
    expect(env.CLOUDFLARE_ACCOUNT_ID).toBe('acc-123');
    expect(env.OWNER_EMAILS).toBe('owner@example.com');
    expect(missingProvisionEnvKeys(env)).toEqual([]);
  });
});
