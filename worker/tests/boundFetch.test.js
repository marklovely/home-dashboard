import { describe, expect, it, vi } from 'vitest';
import { bindFetch } from '../src/lib/boundFetch.js';

describe('bindFetch', () => {
  it('calls fetch with globalThis as receiver', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok', { status: 200 }));
    const bound = bindFetch(fetchImpl);
    const response = await bound('https://example.test/resource');
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0][1]).toBeUndefined();
  });
});
