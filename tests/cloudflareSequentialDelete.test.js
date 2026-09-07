import { describe, expect, it, vi, afterEach } from 'vitest';
import { deleteSequentially, isRetryableCloudflareError } from '../scripts/lib/cloudflare-sequential-delete.mjs';

describe('cloudflareSequentialDelete', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('detects retryable Cloudflare errors', () => {
    expect(isRetryableCloudflareError({ status: 429 })).toBe(true);
    expect(isRetryableCloudflareError({ status: 400 })).toBe(false);
  });

  it('retries 429 responses before succeeding', async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const deleteOne = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error('empty 429 body');
        error.status = 429;
        throw error;
      }
    });

    const promise = deleteSequentially(['a'], deleteOne, {
      delayMs: 0,
      maxAttempts: 5,
      progressEvery: 1
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ deleted: 1, skipped: 0, failed: 0 });
    expect(deleteOne).toHaveBeenCalledTimes(3);
  });
});
