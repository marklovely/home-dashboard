import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { registryDeleteSyncState } from '../scripts/lib/registry-delete-sync.mjs';

const root = process.cwd();

describe('registryDeleteSyncState', () => {
  it('is absent when the site is already gone', () => {
    expect(registryDeleteSyncState(undefined)).toBe('absent');
  });

  it('is ready once the provision follow-up has marked HUB_API attached', () => {
    expect(
      registryDeleteSyncState({ terraform: true, attach_hub_api_binding: true })
    ).toBe('ready');
  });

  it('waits when a terraform hub is still on the create-only registry row', () => {
    expect(
      registryDeleteSyncState({ terraform: true, attach_hub_api_binding: false })
    ).toBe('wait_for_follow_up');
    expect(registryDeleteSyncState({ terraform: true })).toBe('wait_for_follow_up');
  });

  it('does not wait for non-terraform registry rows', () => {
    expect(registryDeleteSyncState({ terraform: false })).toBe('ready');
  });
});

describe('billing deprovision refreshes main before registry delete', () => {
  it('resets to origin/main after archive and before platform-site-manage delete', () => {
    const yml = readFileSync(
      join(root, '.github/workflows/platform-site-billing-deprovision.yml'),
      'utf8'
    );
    const syncAt = yml.indexOf('node scripts/sync-git-main-before-site-delete.mjs "$SITE_ID"');
    const deleteAt = yml.indexOf('node scripts/platform-site-manage.mjs delete');
    const archiveAt = yml.indexOf('node scripts/archive-hub-site-backup.mjs');
    expect(syncAt).toBeGreaterThan(-1);
    expect(deleteAt).toBeGreaterThan(-1);
    expect(archiveAt).toBeGreaterThan(-1);
    expect(archiveAt).toBeLessThan(syncAt);
    expect(syncAt).toBeLessThan(deleteAt);
  });

  it('operator delete refreshes main before editing the registry', () => {
    const yml = readFileSync(join(root, '.github/workflows/platform-site-manage.yml'), 'utf8');
    expect(yml).toContain('node scripts/sync-git-main-before-site-delete.mjs');
    expect(yml).toMatch(/if: inputs\.action == 'delete'/);
  });
});

describe('platform site PR auto-merge', () => {
  it('merges main into a dirty billing-deprovision PR instead of leaving it CONFLICTING', () => {
    const yml = readFileSync(
      join(root, '.github/workflows/platform-site-pr-automerge.yml'),
      'utf8'
    );
    expect(yml).toContain('git merge origin/main -X ours');
    expect(yml).toContain('-billing-deprovision-');
  });
});
