#!/usr/bin/env node
/**
 * Delete orphaned platform/hub-record-* and platform/hub-drop-* snapshot branches.
 * Safe to run manually after deploy — these branches are ephemeral queue inputs.
 *
 * Usage: node scripts/prune-hub-registry-snapshot-branches.mjs [--dry-run]
 */
import {
  deleteGitHubBranch,
  listHubRegistrySnapshotBranches
} from './lib/hub-registry-snapshot-branch.mjs';

const dryRun = process.argv.includes('--dry-run');
const token = String(process.env.PLATFORM_GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
const repository = String(process.env.GITHUB_REPOSITORY ?? '').trim();

if (!token || !repository) {
  console.error('PLATFORM_GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
  process.exit(1);
}

/** @type {string[]} */
const branches = [];
for (const action of /** @type {const} */ (['record', 'drop'])) {
  branches.push(...(await listHubRegistrySnapshotBranches(repository, token, action)));
}

const unique = [...new Set(branches)].sort();
if (!unique.length) {
  console.log('No hub registry snapshot branches to prune.');
  process.exit(0);
}

console.log(`Found ${unique.length} hub registry snapshot branch(es).`);
for (const branch of unique) {
  if (dryRun) {
    console.log(`Would delete ${branch}`);
    continue;
  }
  const result = await deleteGitHubBranch(repository, token, branch);
  console.log(result.deleted ? `Deleted ${branch}` : `${branch} already gone`);
}
