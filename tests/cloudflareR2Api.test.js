import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyR2Bucket, isR2BucketNotFoundError } from '../scripts/lib/cloudflare-r2-api.mjs';

describe('isR2BucketNotFoundError', () => {
  it('detects missing bucket responses', () => {
    expect(
      isR2BucketNotFoundError(404, { errors: [{ message: 'The specified bucket does not exist.' }] }, 'guides-smith')
    ).toBe(true);
    expect(isR2BucketNotFoundError(403, { errors: [{ message: 'Forbidden' }] }, 'guides-smith')).toBe(false);
  });
});

describe('emptyR2Bucket', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists and deletes every object with pagination', async () => {
    let listCalls = 0;
    const deleted = [];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        const href = String(url);
        if (href.includes('/objects?')) {
          listCalls += 1;
          if (listCalls === 1) {
            return Response.json({
              success: true,
              result: [{ key: 'photos/a.jpg' }, { key: 'photos/b.jpg' }],
              result_info: { is_truncated: true, cursor: 'page-2' }
            });
          }
          return Response.json({
            success: true,
            result: [{ key: 'manuals/doc.pdf' }],
            result_info: { is_truncated: false }
          });
        }

        if (init?.method === 'DELETE') {
          const key = decodeURIComponent(href.split('/objects/')[1] ?? '');
          deleted.push(key);
          return Response.json({ success: true, result: { key } });
        }

        throw new Error(`Unexpected fetch: ${href}`);
      })
    );

    const result = await emptyR2Bucket('lovely-home-guide-media-smith', {
      accountId: 'acct',
      token: 'token'
    });

    expect(result).toEqual({ deleted: 3, missing: false });
    expect(deleted.sort()).toEqual(['manuals/doc.pdf', 'photos/a.jpg', 'photos/b.jpg']);
  });

  it('skips buckets that were already deleted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            success: false,
            errors: [{ message: 'The specified bucket does not exist.' }]
          },
          { status: 404 }
        )
      )
    );

    const result = await emptyR2Bucket('lovely-home-appliance-guides-smith', {
      accountId: 'acct',
      token: 'token'
    });

    expect(result).toEqual({ deleted: 0, missing: true });
  });
});
