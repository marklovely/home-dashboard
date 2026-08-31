import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkRegistrySync,
  registryDriftMessage,
  REGISTRY_FILES,
  shouldSkipRegistrySyncCheck
} from '../scripts/check-platform-registry-sync.mjs';

const scriptPath = join(dirname(fileURLToPath(import.meta.url)), '../scripts/check-platform-registry-sync.mjs');

/** @type {string} */
let workspace;
/** @type {string} */
let repo;

function git(cwd, args) {
  execFileSync('git', ['-C', cwd, ...args], { stdio: 'pipe' });
}

function writeRegistry(sites) {
  for (const file of REGISTRY_FILES) {
    const target = join(repo, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, sites);
  }
}

describe('platform registry sync guard', () => {
  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'registry-sync-'));
    const remote = join(workspace, 'remote.git');
    repo = join(workspace, 'repo');

    execFileSync('git', ['init', '--bare', '--initial-branch=main', remote], { stdio: 'pipe' });
    execFileSync('git', ['init', '--initial-branch=main', repo], { stdio: 'pipe' });
    git(repo, ['config', 'user.email', 'test@example.com']);
    git(repo, ['config', 'user.name', 'Registry Test']);
    writeRegistry('sites:\n  smith: {}\n');
    git(repo, ['add', '.']);
    git(repo, ['commit', '-m', 'registry']);
    git(repo, ['remote', 'add', 'origin', remote]);
    git(repo, ['push', '-u', 'origin', 'main']);
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it('passes when the registry matches the base branch', () => {
    expect(checkRegistrySync({ root: repo })).toMatchObject({ ok: true, checked: true });
  });

  it('fails when the working tree registry drifts from the base branch', () => {
    writeFileSync(join(repo, 'platform/sites.yaml'), 'sites:\n  smith: {}\n  powell: {}\n');

    const result = checkRegistrySync({ root: repo });

    expect(result.ok).toBe(false);
    expect(result.driftedFiles).toEqual(['platform/sites.yaml']);
  });

  it('fails when the checkout is behind the base branch', () => {
    const other = join(workspace, 'other');
    execFileSync('git', ['clone', join(workspace, 'remote.git'), other], { stdio: 'pipe' });
    git(other, ['config', 'user.email', 'test@example.com']);
    git(other, ['config', 'user.name', 'Other Test']);
    writeFileSync(join(other, 'platform/sites.yaml'), 'sites:\n  smith: {}\n  blundell: {}\n');
    git(other, ['commit', '-am', 'add blundell']);
    git(other, ['push']);

    const result = checkRegistrySync({ root: repo });

    expect(result.ok).toBe(false);
    expect(result.driftedFiles).toContain('platform/sites.yaml');
  });

  it('skips quietly outside a git checkout', () => {
    expect(checkRegistrySync({ root: workspace })).toMatchObject({ ok: true, checked: false });
  });

  it('skips in CI and when explicitly overridden', () => {
    expect(shouldSkipRegistrySyncCheck({ GITHUB_ACTIONS: 'true' })).toMatch(/CI/);
    expect(shouldSkipRegistrySyncCheck({ CI: 'true' })).toMatch(/CI/);
    expect(shouldSkipRegistrySyncCheck({ PLATFORM_DEPLOY_ALLOW_STALE: '1' })).toMatch(/ALLOW_STALE/);
    expect(shouldSkipRegistrySyncCheck({})).toBeNull();
  });

  it('explains the risk and the way out', () => {
    const message = registryDriftMessage(['platform/sites.yaml']);

    expect(message).toMatch(/torn down/i);
    expect(message).toMatch(/git pull/);
    expect(message).toMatch(/PLATFORM_DEPLOY_ALLOW_STALE=1/);
  });

  it('exits non-zero from the CLI when the registry drifts', () => {
    writeFileSync(join(repo, 'platform/sites.yaml'), 'sites:\n  smith: {}\n  powell: {}\n');

    const result = spawnSync('node', [scriptPath, '--root', repo], {
      encoding: 'utf8',
      env: { ...process.env, CI: '', GITHUB_ACTIONS: '', PLATFORM_DEPLOY_ALLOW_STALE: '' }
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Refusing to deploy/);
  });
});
