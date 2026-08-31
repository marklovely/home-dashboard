#!/usr/bin/env node
/**
 * Guard for local platform admin deploys.
 *
 * deploy-platform-admin.sh regenerates platform-manifest.json from this
 * checkout's platform/sites.yaml, so deploying from a checkout that predates a
 * teardown republishes hubs Terraform has already destroyed — the site then
 * reappears in platform admin with a stale "in state" contract.
 *
 * CI checks out a deliberate commit, so the guard only runs for local deploys.
 *
 * Usage: node scripts/check-platform-registry-sync.mjs [--root <dir>]
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REGISTRY_FILES = ['platform/sites.yaml', 'worker/wrangler.toml'];
const DEFAULT_BASE_REF = 'origin/main';

/**
 * @param {Record<string, string | undefined>} env
 */
export function shouldSkipRegistrySyncCheck(env) {
  if (truthy(env.PLATFORM_DEPLOY_ALLOW_STALE)) {
    return 'PLATFORM_DEPLOY_ALLOW_STALE is set';
  }
  if (env.GITHUB_ACTIONS || env.CI) {
    return 'running in CI';
  }
  return null;
}

/**
 * @param {string[]} driftedFiles
 * @param {string} baseRef
 */
export function registryDriftMessage(driftedFiles, baseRef = DEFAULT_BASE_REF) {
  return [
    `Refusing to deploy: your registry does not match ${baseRef}.`,
    '',
    ...driftedFiles.map((file) => `  ${file}`),
    '',
    'A local deploy rebuilds platform-manifest.json from this checkout, so a stale',
    'registry republishes hubs that have already been torn down (they come back in',
    'platform admin with an "in state" contract Terraform no longer holds).',
    '',
    `Fix: git pull (or merge your registry change into ${baseRef.replace(/^origin\//, '')}), then re-run.`,
    'Override: PLATFORM_DEPLOY_ALLOW_STALE=1 bash scripts/deploy-platform-admin.sh'
  ].join('\n');
}

/**
 * @param {{ root: string, baseRef?: string }} options
 * @returns {{ ok: true, checked: boolean, reason?: string } | { ok: false, driftedFiles: string[], baseRef: string }}
 */
export function checkRegistrySync(options) {
  const root = options.root;
  const baseRef = options.baseRef ?? DEFAULT_BASE_REF;

  if (!git(root, ['rev-parse', '--git-dir']).ok) {
    return { ok: true, checked: false, reason: 'not a git checkout' };
  }

  const remote = baseRef.split('/')[0];
  const fetched = git(root, ['fetch', remote, baseRef.slice(remote.length + 1), '--quiet']);
  if (!fetched.ok) {
    console.warn(`check-platform-registry-sync: could not fetch ${baseRef} — comparing against the last known state.`);
  }

  if (!git(root, ['rev-parse', '--verify', '--quiet', baseRef]).ok) {
    return { ok: true, checked: false, reason: `${baseRef} is unknown here` };
  }

  const driftedFiles = REGISTRY_FILES.filter(
    (file) => !git(root, ['diff', '--quiet', baseRef, '--', file]).ok
  );

  if (driftedFiles.length > 0) {
    return { ok: false, driftedFiles, baseRef };
  }
  return { ok: true, checked: true };
}

/**
 * @param {string} root
 * @param {string[]} args
 */
function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  return { ok: result.status === 0, stdout: result.stdout ?? '' };
}

/** @param {string | undefined} value */
function truthy(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const rootIndex = process.argv.indexOf('--root');
  const root =
    rootIndex >= 0 && process.argv[rootIndex + 1]
      ? process.argv[rootIndex + 1]
      : join(dirname(fileURLToPath(import.meta.url)), '..');

  const skip = shouldSkipRegistrySyncCheck(process.env);
  if (skip) {
    console.log(`check-platform-registry-sync: skipped (${skip}).`);
    process.exit(0);
  }

  const result = checkRegistrySync({ root, baseRef: process.env.PLATFORM_REGISTRY_BASE_REF });
  if (!result.ok) {
    console.error(registryDriftMessage(result.driftedFiles, result.baseRef));
    process.exit(1);
  }
  console.log(
    result.checked
      ? 'check-platform-registry-sync: registry matches the base branch.'
      : `check-platform-registry-sync: skipped (${result.reason}).`
  );
}
