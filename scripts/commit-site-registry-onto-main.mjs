#!/usr/bin/env node
/**
 * Overlay one site's registry snapshot onto origin/main and push with retry.
 * This is the single git writer for paid signup record/drop.
 *
 * Usage: node scripts/commit-site-registry-onto-main.mjs <record|drop> <site_id>
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitResetToOriginMain } from './lib/git-reset-origin-main.mjs';
import { hubRegistryLedgerCommitMessage } from './lib/hub-registry-ledger.mjs';
import { overlaySiteRegistryFiles, REGISTRY_OVERLAY_FILES } from './lib/overlay-site-registry.mjs';
import { validateSiteId } from './lib/site-registry.mjs';

const action = String(process.argv[2] ?? '').trim();
const siteId = String(process.argv[3] ?? '').trim();
if ((action !== 'record' && action !== 'drop') || validateSiteId(siteId)) {
  console.error('Usage: node scripts/commit-site-registry-onto-main.mjs <record|drop> <site_id>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const token = String(process.env.PLATFORM_GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
const repository = String(process.env.GITHUB_REPOSITORY ?? '').trim();
if (!token || !repository) {
  console.error('PLATFORM_GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
  process.exit(1);
}

/** @type {Record<string, string>} */
const sourceFiles = {};
for (const relative of REGISTRY_OVERLAY_FILES) {
  sourceFiles[relative] = readFileSync(join(root, relative), 'utf8');
}

const message = hubRegistryLedgerCommitMessage(action, siteId);
const remote = `https://x-access-token:${token}@github.com/${repository}.git`;

execFileSync('git', ['config', 'user.name', 'github-actions[bot]'], { cwd: root, stdio: 'inherit' });
execFileSync('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com'], {
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

for (let attempt = 1; attempt <= 8; attempt += 1) {
  gitResetToOriginMain({ cwd: root, token, repository });

  /** @type {Record<string, string>} */
  const baseFiles = {};
  for (const relative of REGISTRY_OVERLAY_FILES) {
    baseFiles[relative] = readFileSync(join(root, relative), 'utf8');
  }
  const nextFiles = overlaySiteRegistryFiles(siteId, baseFiles, sourceFiles);
  for (const [relative, contents] of Object.entries(nextFiles)) {
    const dest = join(root, relative);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, contents);
  }

  execFileSync('git', ['add', '--', ...REGISTRY_OVERLAY_FILES], { cwd: root, stdio: 'inherit' });
  const staged = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: root, encoding: 'utf8' }).trim();
  if (!staged) {
    console.log(`No registry ${action} changes for ${siteId} on origin/main.`);
    process.exit(0);
  }

  execFileSync('git', ['commit', '-m', message], { cwd: root, stdio: 'inherit' });
  try {
    execFileSync('git', ['push', remote, 'HEAD:refs/heads/main'], { cwd: root, stdio: 'inherit' });
    console.log(`Pushed ${action} for ${siteId} to origin/main.`);
    process.exit(0);
  } catch (error) {
    console.error(`Push to main rejected (attempt ${attempt}/8). Replaying onto newer origin/main.`);
    if (attempt === 8) {
      throw error;
    }
  }
}
