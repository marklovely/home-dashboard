import { describe, expect, it, vi } from 'vitest';
import {
  buildVirtualButtonUrl,
  triggerVirtualButtonUpstream
} from '../src/services/virtualButtons.js';

describe('virtualButtons upstream', () => {
  it('builds legacy GET URL', () => {
    const url = buildVirtualButtonUrl('secret-code', 5);
    expect(url).toContain('virtualButton=5');
    expect(url).toContain('accessCode=secret-code');
  });

  it('posts JSON to Virtual Buttons API', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ pressed: 5, timeStamp: 'now' })
    });

    await triggerVirtualButtonUpstream({
      accessCode: 'secret-code',
      virtualButtonId: 5,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.virtualbuttons.com/v1');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      virtualButton: 5,
      accessCode: 'secret-code'
    });
  });

  it('falls back to legacy GET when POST fails', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 405, headers: { get: () => '' } })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'text/plain' } });

    await triggerVirtualButtonUpstream({
      accessCode: 'secret-code',
      virtualButtonId: 4,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[1][0])).toContain('virtualButton=4');
  });
});
