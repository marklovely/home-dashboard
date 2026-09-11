/**
 * Ephemeral git branches that hold one site's registry overlay before the
 * hub-registry queue writes directly to main.
 */

import { validateSiteId } from './site-registry.mjs';

/** @typedef {'record' | 'drop'} HubRegistrySnapshotAction */

const SNAPSHOT_BRANCH_RE = /^platform\/hub-(record|drop)-([a-z][a-z0-9_-]{0,31})$/;

/**
 * @param {HubRegistrySnapshotAction} action
 * @param {string} siteId
 */
export function hubRegistrySnapshotBranch(action, siteId) {
  const normalizedAction = String(action ?? '').trim();
  const id = String(siteId ?? '').trim();
  const idError = validateSiteId(id);
  if (normalizedAction !== 'record' && normalizedAction !== 'drop') {
    throw new Error('Hub registry snapshot action must be record or drop.');
  }
  if (idError) {
    throw new Error(idError);
  }
  return `platform/hub-${normalizedAction}-${id}`;
}

/**
 * @param {string} branch
 * @returns {{ action: HubRegistrySnapshotAction, siteId: string } | null}
 */
export function parseHubRegistrySnapshotBranch(branch) {
  const match = SNAPSHOT_BRANCH_RE.exec(String(branch ?? '').trim());
  if (!match) return null;
  return { action: /** @type {HubRegistrySnapshotAction} */ (match[1]), siteId: match[2] };
}

/**
 * @param {string} branch
 */
export function isHubRegistrySnapshotBranch(branch) {
  return parseHubRegistrySnapshotBranch(branch) != null;
}

/**
 * @param {string} repository owner/name
 * @param {string} token
 * @param {string} branch
 */
export async function deleteGitHubBranch(repository, token, branch) {
  const repo = String(repository ?? '').trim();
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    throw new Error('GITHUB_REPOSITORY must be owner/name.');
  }
  const ref = encodeURIComponent(`heads/${branch}`);
  const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs/${ref}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'lovely-home-hub-registry',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (response.status === 404) {
    return { deleted: false, reason: 'not_found' };
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Could not delete ${branch} (${response.status}): ${detail.slice(0, 300)}`);
  }
  return { deleted: true, reason: 'deleted' };
}

/**
 * @param {string} repository owner/name
 * @param {string} token
 * @param {'record' | 'drop'} action
 */
export async function listHubRegistrySnapshotBranches(repository, token, action) {
  const repo = String(repository ?? '').trim();
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    throw new Error('GITHUB_REPOSITORY must be owner/name.');
  }
  if (action !== 'record' && action !== 'drop') {
    throw new Error('Hub registry snapshot action must be record or drop.');
  }
  const prefix = encodeURIComponent(`heads/platform/hub-${action}`);
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/git/matching-refs/${prefix}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'lovely-home-hub-registry',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Could not list hub-${action} branches (${response.status}): ${detail.slice(0, 300)}`);
  }
  const refs = await response.json();
  if (!Array.isArray(refs)) return [];
  return refs
    .map((entry) => String(entry?.ref ?? '').replace(/^refs\/heads\//, ''))
    .filter((branch) => isHubRegistrySnapshotBranch(branch));
}
