import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  clipHubSetupFailedMessage,
  hubSetupFailedSql
} from '../scripts/lib/hub-setup-failed.mjs';

const root = resolve(import.meta.dirname, '..');

describe('hub setup failed SQL', () => {
  it('records a provision workflow failure without touching the registry lock', () => {
    const sql = hubSetupFailedSql({
      siteId: 'kitchen-home',
      kind: 'provision',
      message: 'Hub provision workflow failed (run 123).',
      now: 1_700_000_000
    });

    expect(sql).toContain("provision_last_error = 'Hub provision workflow failed (run 123).'");
    expect(sql).toContain('updated_at = 1700000000');
    expect(sql).toContain("site_id = 'kitchen-home'");
    expect(sql).not.toMatch(/registry_/);
  });

  it('clears the registry lock so a Stripe retry can try again', () => {
    const sql = hubSetupFailedSql({
      siteId: 'kitchen_home',
      kind: 'registry',
      message: "GitHub said it didn't start",
      now: 1_700_000_000
    });

    expect(sql).toContain('registry_dispatched_at = NULL');
    expect(sql).toContain("registry_last_error = 'GitHub said it didn''t start'");
    expect(sql).toContain("site_id = 'kitchen_home'");
  });

  it('rejects an invalid site id or kind', () => {
    expect(() => hubSetupFailedSql({ siteId: 'Not A Slug', kind: 'provision' })).toThrow(/invalid hub address/i);
    expect(() => hubSetupFailedSql({ siteId: 'smith', kind: 'delete' })).toThrow(/kind must be/i);
  });

  it('clips long messages', () => {
    expect(clipHubSetupFailedMessage('x'.repeat(600))).toHaveLength(500);
  });
});

describe('provision workflow records signup-page failures', () => {
  it('writes provision_last_error when the reusable provision job fails', () => {
    const yaml = readFileSync(resolve(root, '.github/workflows/platform-site-provision-reusable.yml'), 'utf8');
    expect(yaml).toMatch(/if:\s*failure\(\)/);
    expect(yaml).toMatch(/mark-hub-setup-failed\.mjs/);
    expect(yaml).toMatch(/--kind provision/);
  });

  it('writes registry_last_error when a create site-manage job fails', () => {
    const yaml = readFileSync(resolve(root, '.github/workflows/platform-site-manage.yml'), 'utf8');
    expect(yaml).toMatch(/if:\s*failure\(\)\s*&&\s*inputs\.action\s*==\s*'create'/);
    expect(yaml).toMatch(/mark-hub-setup-failed\.mjs/);
    expect(yaml).toMatch(/--kind registry/);
  });
});
