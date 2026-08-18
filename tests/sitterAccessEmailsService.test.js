import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getSitterAccessEmails,
  resetSitterAccessEmailsForTests,
  saveSitterAccessEmails
} from '../src/services/sitterAccessEmailsService.js';

describe('sitterAccessEmailsService', () => {
  beforeEach(() => {
    resetSitterAccessEmailsForTests();
    vi.unstubAllEnvs();
  });

  it('stores emails from save response', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi.fn(async () =>
      Response.json({
        sitterAccessEmails: ['sitter@example.com'],
        accessSitterSyncConfigured: true,
        accessSyncOk: true,
        sitterSecretsDisclosed: false
      })
    );

    const result = await saveSitterAccessEmails(['sitter@example.com'], fetchImpl);
    expect(result.ok).toBe(true);
    expect(getSitterAccessEmails()).toEqual(['sitter@example.com']);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/api/house-settings/sitter-emails',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
