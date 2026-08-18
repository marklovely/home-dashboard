import { describe, expect, it, vi } from 'vitest';
import {
  getSitterAccessEmails,
  resetSitterAccessEmailsForTests,
  saveSitterAccessEmails
} from '../src/services/sitterAccessEmailsService.js';

describe('sitterAccessEmailsService', () => {
  it('stores emails from save response', async () => {
    resetSitterAccessEmailsForTests();
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
  });
});
