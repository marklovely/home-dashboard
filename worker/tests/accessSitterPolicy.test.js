import { describe, expect, it, vi } from 'vitest';
import {
  buildSitterPolicyInclude,
  parseSitterEmailsFromPolicyInclude,
  syncSitterEmailsToAccess
} from '../src/lib/accessSitterPolicy.js';

describe('accessSitterPolicy', () => {
  it('builds email include rules', () => {
    expect(buildSitterPolicyInclude(['Sitter@Example.com'])).toEqual([
      { email: { email: 'sitter@example.com' } }
    ]);
  });

  it('parses email include rules', () => {
    expect(
      parseSitterEmailsFromPolicyInclude([
        { email: { email: 'sitter@example.com' } },
        { any_valid_service_token: {} }
      ])
    ).toEqual(['sitter@example.com']);
  });

  it('updates, creates, and deletes sitter policies on both apps', async () => {
    /** @type {Record<string, unknown>} */
    const pagesPolicies = [{ id: 'owners', name: 'Owners', precedence: 2, include: [] }];
    /** @type {Record<string, unknown>} */
    const workerPolicies = [{ id: 'owners', name: 'Owners', precedence: 2, include: [] }];

    const fetchImpl = vi.fn(async (url, init) => {
      const method = init?.method ?? 'GET';
      if (String(url).includes('/access/apps/pages-app/policies') && method === 'GET') {
        return Response.json({ success: true, result: pagesPolicies });
      }
      if (String(url).includes('/access/apps/worker-app/policies') && method === 'GET') {
        return Response.json({ success: true, result: workerPolicies });
      }
      if (method === 'PUT') {
        return Response.json({ success: true, result: {} });
      }
      if (method === 'POST') {
        return Response.json({ success: true, result: { id: 'new-sitter' } });
      }
      if (method === 'DELETE') {
        return Response.json({ success: true, result: {} });
      }
      return Response.json({ success: false }, { status: 500 });
    });

    const env = {
      CLOUDFLARE_ACCOUNT_ID: 'acct',
      ACCESS_PAGES_APP_ID: 'pages-app',
      ACCESS_WORKER_APP_ID: 'worker-app',
      CF_ACCESS_MANAGEMENT_TOKEN: 'token'
    };

    const createResult = await syncSitterEmailsToAccess(env, ['sitter@example.com'], fetchImpl);
    expect(createResult.ok).toBe(true);
    expect(fetchImpl.mock.calls.some((call) => call[1]?.method === 'POST')).toBe(true);

    pagesPolicies.push({
      id: 'sitter',
      name: 'House sitters',
      precedence: 3,
      include: [{ email: { email: 'sitter@example.com' } }]
    });
    workerPolicies.push({
      id: 'sitter',
      name: 'House sitters',
      precedence: 3,
      include: [{ email: { email: 'sitter@example.com' } }]
    });

    const updateResult = await syncSitterEmailsToAccess(
      env,
      ['sitter@example.com', 'other@example.com'],
      fetchImpl
    );
    expect(updateResult.ok).toBe(true);
    expect(fetchImpl.mock.calls.some((call) => call[1]?.method === 'PUT')).toBe(true);

    const deleteResult = await syncSitterEmailsToAccess(env, [], fetchImpl);
    expect(deleteResult.ok).toBe(true);
    expect(fetchImpl.mock.calls.some((call) => call[1]?.method === 'DELETE')).toBe(true);
  });
});
