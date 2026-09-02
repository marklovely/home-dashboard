import { describe, expect, it } from 'vitest';
import { parseCloudflareApiJson } from '../scripts/lib/cloudflare-api-json.mjs';

describe('parseCloudflareApiJson', () => {
  it('treats an empty 200 as an empty result list', () => {
    expect(
      parseCloudflareApiJson('', { ok: true, status: 200, path: '/pages/projects/x/deployments', method: 'GET' })
    ).toEqual({ success: true, result: [] });
  });

  it('throws on an empty error response', () => {
    expect(() =>
      parseCloudflareApiJson('  ', { ok: false, status: 500, path: '/pages/projects/x', method: 'GET' })
    ).toThrow(/empty 500 body/);
  });

  it('parses a normal Cloudflare envelope', () => {
    const body = parseCloudflareApiJson(
      JSON.stringify({ success: true, result: [{ id: 'dep-1' }] }),
      { ok: true, status: 200, path: '/pages/projects/x/deployments', method: 'GET' }
    );
    expect(body.result[0].id).toBe('dep-1');
  });
});
