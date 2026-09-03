import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  listAllPagesDeployments,
  prunePagesProjectDeployments
} from '../scripts/lib/cloudflare-pages-api.mjs';

describe('cloudflarePagesApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists deployments across pages', async () => {
    const fetchMock = vi.fn(async (url) => {
      const parsed = new URL(url);
      const page = Number(parsed.searchParams.get('page') ?? '1');
      if (page === 1) {
        return new Response(
          JSON.stringify({
            success: true,
            result: [{ id: 'dep-1' }, { id: 'dep-2' }],
            result_info: { total_pages: 2, page: 1, per_page: 2 }
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          result: [{ id: 'dep-3' }],
          result_info: { total_pages: 2, page: 2, per_page: 2 }
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const ids = await listAllPagesDeployments('acct', 'token', 'home-dashboard-smith');
    expect(ids).toEqual(['dep-1', 'dep-2', 'dep-3']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('per_page')).toBe('25');
  });

  it('deletes every deployment with force=true', async () => {
    const remaining = new Set(['dep-a']);
    const fetchMock = vi.fn(async (url, init) => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith('/deployments') && init?.method !== 'DELETE') {
        return new Response(
          JSON.stringify({
            success: true,
            result: remaining.size ? [{ id: [...remaining][0] }] : [],
            result_info: { total_pages: 1, page: 1, per_page: 100 }
          }),
          { status: 200 }
        );
      }
      if (init?.method === 'DELETE') {
        expect(parsed.searchParams.get('force')).toBe('true');
        const deploymentId = parsed.pathname.split('/').pop();
        remaining.delete(deploymentId);
        return new Response(JSON.stringify({ success: true, result: {} }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: true, result: [] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await prunePagesProjectDeployments('home-dashboard-smith', {
      accountId: 'acct',
      token: 'token'
    });
    expect(result).toEqual({
      projectName: 'home-dashboard-smith',
      deleted: 1,
      remaining: 0
    });
  });
});
