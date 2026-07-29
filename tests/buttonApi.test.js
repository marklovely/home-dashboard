import { describe, expect, it, vi } from 'vitest';
import { formatButtonCode, buttonApi } from '../src/api/buttonApi.js';

describe('buttonApi', () => {
  it('formats numeric IDs as VB codes', () => {
    expect(formatButtonCode(1)).toBe('VB01');
    expect(formatButtonCode(9)).toBe('VB09');
    expect(buttonApi.formatCode(2)).toBe('VB02');
  });

  it('posts to the Worker without an access code', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

    await buttonApi.press('VB01', fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/api/button/VB01',
      expect.objectContaining({ method: 'POST' })
    );
    const body = fetchImpl.mock.calls[0][1];
    expect(JSON.stringify(body)).not.toMatch(/accessCode/i);
    vi.unstubAllEnvs();
  });

  it('posts same-origin when API base URL is empty (Pages proxy)', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const { resetApiBaseForTests } = await import('../src/api/apiBase.js');
    resetApiBaseForTests();

    await buttonApi.press('VB01', fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/button/VB01',
      expect.objectContaining({ method: 'POST' })
    );
    vi.unstubAllEnvs();
  });
});
