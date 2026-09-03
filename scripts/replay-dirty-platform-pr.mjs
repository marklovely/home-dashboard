#!/usr/bin/env node
/**
 * CI helper: replay a dirty or behind automated platform registry PR onto origin/main.
 *
 * Reads the PR's registry files with `git show` and writes the overlay from a
 * trusted main checkout — it never checks out the PR branch (that would run
 * untrusted hooks/scripts with PLATFORM_GITHUB_TOKEN).
 *
 * Usage:
 *   node scripts/replay-dirty-platform-pr.mjs <pr_number>
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { siteIdFromPlatformPrTitle } from './lib/platform-pr-site-id.mjs';
import { platformPrNeedsRegistryOverlay } from './lib/platform-pr-needs-overlay.mjs';
import {
  overlaySiteRegistryFiles,
  REGISTRY_OVERLAY_FILES
} from './lib/overlay-site-registry.mjs';

const pr = String(process.argv[2] ?? '').trim();
if (!/^\d+$/.test(pr)) {
  console.error('Usage: node scripts/replay-dirty-platform-pr.mjs <pr_number>');
  process.exit(1);
}

const payload = JSON.parse(
  execFileSync(
    'gh',
    ['pr', 'view', pr, '--json', 'title,headRefName,mergeable,mergeStateStatus,url'],
    { encoding: 'utf8' }
  )
);

const siteId = siteIdFromPlatformPrTitle(payload.title);
if (!siteId) {
  console.error(`Could not parse site id from title: ${payload.title}`);
  process.exit(1);
}

const headRef = String(payload.headRefName ?? '');
if (!headRef.startsWith('platform/')) {
  console.error(`Refusing to rewrite non-platform branch ${headRef}`);
  process.exit(1);
}

let mergeable = payload.mergeable;
let mergeStateStatus = payload.mergeStateStatus;
for (let attempt = 0; attempt < 8 && (mergeable === 'UNKNOWN' || mergeStateStatus === 'UNKNOWN'); attempt += 1) {
  execFileSync('sleep', ['5']);
  const next = JSON.parse(
    execFileSync('gh', ['pr', 'view', pr, '--json', 'mergeable,mergeStateStatus'], { encoding: 'utf8' })
  );
  mergeable = next.mergeable;
  mergeStateStatus = next.mergeStateStatus;
}

execFileSync('git', ['fetch', 'origin', 'main'], { stdio: 'inherit' });
execFileSync('git', ['fetch', 'origin', `pull/${pr}/head:refs/tmp-overlay-pr-${pr}`], { stdio: 'inherit' });

const prRef = `refs/tmp-overlay-pr-${pr}`;
const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', 'origin/main', prRef]);
const baseIsAncestorOfHead = ancestor.status === 0;

if (
  !platformPrNeedsRegistryOverlay({
    mergeable,
    mergeStateStatus,
    baseIsAncestorOfHead
  })
) {
  console.log(
    `PR #${pr} is ${mergeable}/${mergeStateStatus} and up to date with origin/main; no overlay needed.`
  );
  process.exit(0);
}

execFileSync('git', ['config', 'user.name', 'github-actions[bot]'], { stdio: 'inherit' });
execFileSync('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], {
  stdio: 'inherit'
});
execFileSync('git', ['checkout', '--detach', 'origin/main'], { stdio: 'inherit' });

/** @param {string} ref @param {string} relative */
function gitShow(ref, relative) {
  return execFileSync('git', ['show', `${ref}:${relative}`], { encoding: 'utf8' });
}

/** @type {Record<string, string>} */
const baseFiles = {};
/** @type {Record<string, string>} */
const sourceFiles = {};
for (const relative of REGISTRY_OVERLAY_FILES) {
  baseFiles[relative] = gitShow('origin/main', relative);
  sourceFiles[relative] = gitShow(prRef, relative);
}

const nextFiles = overlaySiteRegistryFiles(siteId, baseFiles, sourceFiles);
for (const [relative, contents] of Object.entries(nextFiles)) {
  writeFileSync(relative, contents);
}

execFileSync('git', ['add', '--', ...REGISTRY_OVERLAY_FILES], { stdio: 'inherit' });

const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
if (!dirty) {
  console.log(`PR #${pr}: overlay matches origin/main; closing empty PR.`);
  execFileSync('gh', ['pr', 'close', pr, '--comment', 'Registry change is already on main.'], {
    stdio: 'inherit'
  });
  process.exit(0);
}

execFileSync(
  'git',
  ['commit', '-m', `Replay ${siteId} registry onto origin/main so concurrent site PRs can merge.`],
  { stdio: 'inherit' }
);
execFileSync('git', ['push', '--force-with-lease', 'origin', `HEAD:${headRef}`], { stdio: 'inherit' });
console.log(`Replayed ${siteId} onto origin/main for ${payload.url}`);
