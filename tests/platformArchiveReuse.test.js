import { afterEach, describe, expect, it, vi } from 'vitest';
import { readRecentSiteArchivePointer } from '../scripts/lib/platform-archive-reuse.mjs';

describe('readRecentSiteArchivePointer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('returns null when latest.json is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 }))
    );

    const result = await readRecentSiteArchivePointer('smith', {
      bucket: 'lovely-home-hub-archives',
      accountId: 'acct',
      token: 'token'
    });
    expect(result).toBeNull();
  });

  it('returns backup key when latest pointer is recent', async () => {
    const archivedAt = new Date().toISOString();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({}, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            siteId: 'smith',
            archivedAt,
            backupKey: 'smith/site-backup-test.json'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const result = await readRecentSiteArchivePointer('smith', {
      bucket: 'lovely-home-hub-archives',
      accountId: 'acct',
      token: 'token'
    });
    expect(result).toEqual({
      backupKey: 'smith/site-backup-test.json',
      latestKey: 'smith/latest.json',
      archivedAt
    });
  });
});
