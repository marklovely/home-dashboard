import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  isActiveWorkerDeploymentDeleteError,
  listWorkerScriptNames,
  sortWorkerDeploymentsNewestFirst,
  trimWorkerScriptDeployments
} from '../scripts/lib/cloudflare-workers-api.mjs';

describe('cloudflareWorkersApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects active Worker deployment delete errors', () => {
    expect(
      isActiveWorkerDeploymentDeleteError(
        new Error('The latest deployment, which is actively serving traffic, cannot be deleted.')
      )
    ).toBe(true);
  });

  it('sorts Worker deployments newest first', () => {
    expect(
      sortWorkerDeploymentsNewestFirst([
        { id: 'old', created_on: '2020-01-01T00:00:00.000Z' },
        { id: 'new', created_on: '2026-01-01T00:00:00.000Z' }
      ]).map((entry) => entry.id)
    ).toEqual(['new', 'old']);
  });

  it('keeps the newest Worker deployments when trimming', async () => {
    const remaining = new Map([
      ['dep-new', '2026-01-03T00:00:00.000Z'],
      ['dep-mid', '2026-01-02T00:00:00.000Z'],
      ['dep-old', '2026-01-01T00:00:00.000Z']
    ]);
    const fetchMock = vi.fn(async (url, init) => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith('/deployments') && init?.method !== 'DELETE') {
        return new Response(
          JSON.stringify({
            success: true,
            result: {
              deployments: [...remaining.entries()].map(([id, created_on]) => ({ id, created_on }))
            }
          }),
          { status: 200 }
        );
      }
      if (init?.method === 'DELETE') {
        const deploymentId = parsed.pathname.split('/').pop();
        remaining.delete(deploymentId ?? '');
        return new Response(JSON.stringify({ success: true, result: {} }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: true, result: {} }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await trimWorkerScriptDeployments('lovely-home-hub-api-smith', {
      accountId: 'acct',
      token: 'token',
      keep: 2,
      delayMs: 0
    });

    expect(result).toMatchObject({
      scriptName: 'lovely-home-hub-api-smith',
      total: 3,
      deleted: 1,
      remaining: 2,
      failed: 0
    });
    expect(remaining.has('dep-old')).toBe(false);
  });

  it('lists Worker scripts without unsupported pagination params', async () => {
    const fetchMock = vi.fn(async (url) => {
      const parsed = new URL(url);
      expect(parsed.searchParams.get('page')).toBeNull();
      expect(parsed.searchParams.get('per_page')).toBeNull();
      return new Response(
        JSON.stringify({
          success: true,
          result: [{ id: 'lovely-home-hub-api-smith' }, { id: 'lovely-home-hub-api' }]
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const names = await listWorkerScriptNames('acct', 'token');
    expect(names).toEqual(['lovely-home-hub-api', 'lovely-home-hub-api-smith']);
  });
});
