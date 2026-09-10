import { describe, expect, it, vi } from 'vitest';
import { resolveUprnFromPropertyAddress } from '../src/lib/getAddressBrowser.js';

describe('resolveUprnFromPropertyAddress', () => {
  it('returns UPRN from getAddress autocomplete + detail', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes('/autocomplete/')) {
        return new Response(JSON.stringify({ suggestions: [{ id: 'addr-1' }] }), { status: 200 });
      }
      if (String(url).includes('/get/')) {
        return new Response(JSON.stringify({ uprn: '100012345678' }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await resolveUprnFromPropertyAddress(
      { line1: '1 High Street', city: 'Stratford-upon-Avon', postcode: 'CV37 6NT' },
      'test-key',
      fetchImpl
    );

    expect(result.ok).toBe(true);
    expect(result.uprn).toBe('100012345678');
  });
});
