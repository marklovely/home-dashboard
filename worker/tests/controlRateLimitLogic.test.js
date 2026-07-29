import { describe, expect, it } from 'vitest';
import {
  CONTROL_MAX_PER_MINUTE,
  isDuplicateCooldown,
  isOverRateLimit,
  pruneTimestamps
} from '../src/lib/controlRateLimitLogic.js';

describe('control rate limit logic', () => {
  it('prunes timestamps outside the window', () => {
    const now = 90_000;
    const recent = pruneTimestamps([0, 30_000, 59_000], now);
    expect(recent).toEqual([30_000, 59_000]);
  });

  it('flags rate limit at ten actions per minute', () => {
    const now = 120_000;
    const timestamps = Array.from({ length: CONTROL_MAX_PER_MINUTE }, (_, index) => now - index * 1000);
    expect(isOverRateLimit(timestamps, now)).toBe(true);
  });

  it('enforces duplicate cooldown window', () => {
    const now = 10_000;
    expect(isDuplicateCooldown(9000, now)).toBe(true);
    expect(isDuplicateCooldown(7000, now)).toBe(false);
  });
});
