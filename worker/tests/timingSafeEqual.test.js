import { describe, expect, it } from 'vitest';
import { timingSafeEqualString } from '../src/lib/timingSafeEqual.js';

describe('timingSafeEqualString', () => {
  it('matches equal strings', () => {
    expect(timingSafeEqualString('1234', '1234')).toBe(true);
  });

  it('rejects unequal strings', () => {
    expect(timingSafeEqualString('1234', '1235')).toBe(false);
    expect(timingSafeEqualString('1234', '12345')).toBe(false);
  });
});
