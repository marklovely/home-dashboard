#!/usr/bin/env node
/**
 * Delete the ephemeral registry snapshot branch after overlay onto main.
 *
 * Usage: node scripts/delete-hub-registry-snapshot-branch.mjs <record|drop> <site_id>
 */
import {
  deleteGitHubBranch,
  hubRegistrySnapshotBranch
} from './lib/hub-registry-snapshot-branch.mjs';

const action = String(process.argv[2] ?? '').trim();
const siteId = String(process.argv[3] ?? '').trim();
const token = String(process.env.PLATFORM_GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
const repository = String(process.env.GITHUB_REPOSITORY ?? '').trim();

if (!token || !repository) {
  console.error('PLATFORM_GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
  process.exit(1);
}

let branch;
try {
  branch = hubRegistrySnapshotBranch(
    /** @type {'record' | 'drop'} */ (action),
    siteId
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('Usage: node scripts/delete-hub-registry-snapshot-branch.mjs <record|drop> <site_id>');
  process.exit(1);
}

const expectedRef = String(process.env.SOURCE_REF ?? '').trim();
if (expectedRef && expectedRef !== branch) {
  console.error(`Refusing to delete ${branch}: SOURCE_REF is ${expectedRef}.`);
  process.exit(1);
}

const result = await deleteGitHubBranch(repository, token, branch);
if (result.deleted) {
  console.log(`Deleted registry snapshot branch ${branch}.`);
} else {
  console.log(`Registry snapshot branch ${branch} was already gone.`);
}
