#!/usr/bin/env node
/**
 * Push this checkout's registry files to a per-site snapshot branch.
 * The hub-registry queue consumer overlays that snapshot onto origin/main.
 *
 * Usage: node scripts/push-hub-registry-snapshot.mjs <record|drop> <site_id>
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRY_OVERLAY_FILES } from './lib/overlay-site-registry.mjs';
import { validateSiteId } from './lib/site-registry.mjs';

const action = String(process.argv[2] ?? '').trim();
const siteId = String(process.argv[3] ?? '').trim();
if ((action !== 'record' && action !== 'drop') || validateSiteId(siteId)) {
  console.error('Usage: node scripts/push-hub-registry-snapshot.mjs <record|drop> <site_id>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const token = String(process.env.PLATFORM_GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
const repository = String(process.env.GITHUB_REPOSITORY ?? '').trim();
if (!token || !repository) {
  console.error('PLATFORM_GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
  process.exit(1);
}

const branch = `platform/hub-${action}-${siteId}`;
execFileSync('git', ['config', 'user.name', 'github-actions[bot]'], { cwd: root, stdio: 'inherit' });
execFileSync('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com'], {
  cwd: root,
  stdio: 'inherit'
});
execFileSync('git', ['add', '--', ...REGISTRY_OVERLAY_FILES], { cwd: root, stdio: 'inherit' });
const staged = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: root, encoding: 'utf8' }).trim();
if (!staged) {
  console.log(`No registry overlay files changed for ${siteId} (${action}).`);
  process.exit(0);
}

execFileSync('git', ['commit', '-m', `platform: hub-${action} snapshot ${siteId}`], {
  cwd: root,
  stdio: 'inherit'
});
try {
  execFileSync('git', ['config', '--unset-all', 'http.https://github.com/.extraheader'], {
    cwd: root,
    stdio: 'inherit'
  });
} catch {
  // Checkout may not have set the extraheader.
}

const remote = `https://x-access-token:${token}@github.com/${repository}.git`;
execFileSync('git', ['push', '--force', remote, `HEAD:refs/heads/${branch}`], { cwd: root, stdio: 'inherit' });

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  appendFileSync(githubOutput, `source_ref=${branch}\n`);
}
console.log(`Pushed registry snapshot ${branch}`);
