import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  deleteGitHubBranch,
  hubRegistrySnapshotBranch,
  isHubRegistrySnapshotBranch,
  listHubRegistrySnapshotBranches,
  parseHubRegistrySnapshotBranch
} from '../scripts/lib/hub-registry-snapshot-branch.mjs';

describe('hub registry snapshot branches', () => {
  it('builds and parses branch names', () => {
    expect(hubRegistrySnapshotBranch('record', 'e2e-jon9klm6')).toBe('platform/hub-record-e2e-jon9klm6');
    expect(hubRegistrySnapshotBranch('drop', 'test-cottage')).toBe('platform/hub-drop-test-cottage');
    expect(parseHubRegistrySnapshotBranch('platform/hub-record-e2e-jon9klm6')).toEqual({
      action: 'record',
      siteId: 'e2e-jon9klm6'
    });
    expect(isHubRegistrySnapshotBranch('platform/site-smith-create')).toBe(false);
  });

  it('rejects invalid site ids', () => {
    expect(() => hubRegistrySnapshotBranch('record', 'Bad')).toThrow(/Invalid site id/i);
  });
});

describe('deleteGitHubBranch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deletes a branch ref via the GitHub API', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 204 }));
    vi.stubGlobal('fetch', fetchImpl);

    const result = await deleteGitHubBranch('marklovely/home-dashboard', 'token', 'platform/hub-drop-willow');
    expect(result).toEqual({ deleted: true, reason: 'deleted' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.github.com/repos/marklovely/home-dashboard/git/refs/heads%2Fplatform%2Fhub-drop-willow',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('treats missing branches as already gone', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));

    const result = await deleteGitHubBranch('marklovely/home-dashboard', 'token', 'platform/hub-record-rose');
    expect(result).toEqual({ deleted: false, reason: 'not_found' });
  });
});

describe('listHubRegistrySnapshotBranches', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists matching refs for record and drop prefixes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        json: async () =>
          String(url).includes('hub-record')
            ? [{ ref: 'refs/heads/platform/hub-record-a' }, { ref: 'refs/heads/platform/hub-record-b' }]
            : [{ ref: 'refs/heads/platform/hub-drop-a' }]
      }))
    );

    expect(await listHubRegistrySnapshotBranches('marklovely/home-dashboard', 'token', 'record')).toEqual([
      'platform/hub-record-a',
      'platform/hub-record-b'
    ]);
    expect(await listHubRegistrySnapshotBranches('marklovely/home-dashboard', 'token', 'drop')).toEqual([
      'platform/hub-drop-a'
    ]);
  });
});
