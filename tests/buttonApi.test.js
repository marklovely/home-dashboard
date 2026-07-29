import { describe, expect, it, vi } from 'vitest';
import { formatButtonCode, pressButton, buttonApi } from '../src/api/buttonApi.js';

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

  it('requires API base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    await expect(pressButton('VB01')).rejects.toThrow(/API base URL/i);
    vi.unstubAllEnvs();
  });
});
