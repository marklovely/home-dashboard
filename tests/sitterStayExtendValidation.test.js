import { describe, expect, it } from 'vitest';
import { validateExtendStayEndDate } from '../src/lib/sitterStayExtendValidation.js';

describe('validateExtendStayEndDate', () => {
  it('requires a date after the current end', () => {
    expect(validateExtendStayEndDate('2026-03-12', '2026-03-19', '2026-03-19')).toMatch(
      /after the current end date/i
    );
    expect(validateExtendStayEndDate('2026-03-12', '2026-03-19', '2026-03-18')).toMatch(
      /after the current end date/i
    );
  });

  it('accepts a later end date', () => {
    expect(validateExtendStayEndDate('2026-03-12', '2026-03-19', '2026-03-26')).toBeNull();
  });
});
