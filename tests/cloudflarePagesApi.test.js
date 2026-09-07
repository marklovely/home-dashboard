import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  isActiveProductionDeploymentDeleteError,
  listAllPagesDeployments,
  listPagesProjectNames,
  prunePagesProjectDeployments,
  sortPagesDeploymentsNewestFirst,
  trimPagesProjectDeployments
} from '../scripts/lib/cloudflare-pages-api.mjs';

describe('cloudflarePagesApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects active production delete errors', () => {
    expect(
      isActiveProductionDeploymentDeleteError(
        new Error('You cannot delete the active production deployment.')
      )
    ).toBe(true);
  });

  it('lists deployments across pages', async () => {
    const fetchMock = vi.fn(async (url) => {
      const parsed = new URL(url);
      const page = Number(parsed.searchParams.get('page') ?? '1');
      if (page === 1) {
        return new Response(
          JSON.stringify({
            success: true,
            result: [
              { id: 'dep-1', created_on: '2026-01-01T00:00:00.000Z' },
              { id: 'dep-2', created_on: '2026-01-02T00:00:00.000Z' }
            ],
            result_info: { total_pages: 2, page: 1, per_page: 2 }
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          result: [{ id: 'dep-3', created_on: '2026-01-03T00:00:00.000Z' }],
          result_info: { total_pages: 2, page: 2, per_page: 2 }
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const ids = await listAllPagesDeployments('acct', 'token', 'home-dashboard-smith');
    expect(ids).toEqual(['dep-3', 'dep-2', 'dep-1']);
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
      skippedActiveProduction: 0,
      remaining: 0
    });
  });

  it('skips active production deployment deletes', async () => {
    const remaining = new Set(['dep-prod', 'dep-preview']);
    const fetchMock = vi.fn(async (url, init) => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith('/deployments') && init?.method !== 'DELETE') {
        return new Response(
          JSON.stringify({
            success: true,
            result: [...remaining].map((id) => ({ id })),
            result_info: { total_pages: 1, page: 1, per_page: 25 }
          }),
          { status: 200 }
        );
      }
      if (init?.method === 'DELETE') {
        const deploymentId = parsed.pathname.split('/').pop();
        if (deploymentId === 'dep-prod') {
          return new Response(
            JSON.stringify({
              success: false,
              errors: [{ message: 'You cannot delete the active production deployment.' }]
            }),
            { status: 400 }
          );
        }
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
      skippedActiveProduction: 1,
      remaining: 1
    });
  });

  it('sorts Pages deployments newest first', () => {
    expect(
      sortPagesDeploymentsNewestFirst([
        { id: 'old', created_on: '2020-01-01T00:00:00.000Z' },
        { id: 'new', created_on: '2026-01-01T00:00:00.000Z' }
      ]).map((entry) => entry.id)
    ).toEqual(['new', 'old']);
  });

  it('keeps the newest Pages deployments when trimming', async () => {
    const remaining = new Map([
      ['dep-new', '2026-01-03T00:00:00.000Z'],
      ['dep-mid', '2026-01-02T00:00:00.000Z'],
      ['dep-old', '2026-01-01T00:00:00.000Z']
    ]);
    const fetchMock = vi.fn(async (url, init) => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith('/deployments') && init?.method !== 'DELETE') {
        const entries = [...remaining.entries()].map(([id, created_on]) => ({ id, created_on }));
        return new Response(
          JSON.stringify({
            success: true,
            result: entries,
            result_info: {
              total_count: entries.length,
              total_pages: 1,
              page: 1,
              per_page: 25
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
      return new Response(JSON.stringify({ success: true, result: [] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await trimPagesProjectDeployments('home-dashboard-smith', {
      accountId: 'acct',
      token: 'token',
      keep: 2,
      delayMs: 0
    });

    expect(result).toMatchObject({
      projectName: 'home-dashboard-smith',
      total: 3,
      deleted: 1,
      remaining: 2,
      failed: 0
    });
    expect(remaining.has('dep-old')).toBe(false);
    expect(remaining.has('dep-new')).toBe(true);
    expect(remaining.has('dep-mid')).toBe(true);
  });

  it('lists Pages projects with per_page capped at 20', async () => {
    const fetchMock = vi.fn(async (url) => {
      const parsed = new URL(url);
      expect(parsed.searchParams.get('per_page')).toBe('20');
      return new Response(
        JSON.stringify({
          success: true,
          result: [{ name: 'lovely-home' }],
          result_info: { total_pages: 1, page: 1, per_page: 20 }
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const names = await listPagesProjectNames('acct', 'token');
    expect(names).toEqual(['lovely-home']);
  });
});
