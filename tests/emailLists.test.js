import { describe, expect, it } from 'vitest';
import { formatEmailList, parseEmailList, validateEmailList } from '../scripts/lib/email-lists.mjs';

describe('email-lists', () => {
  it('parses comma- and newline-separated lists', () => {
    expect(parseEmailList('a@b.com, c@d.com')).toEqual(['a@b.com', 'c@d.com']);
    expect(parseEmailList('a@b.com\nc@d.com')).toEqual(['a@b.com', 'c@d.com']);
  });

  it('normalizes and formats', () => {
    expect(formatEmailList(['A@B.com', 'c@d.com'])).toBe('a@b.com,c@d.com');
  });

  it('validates owner emails', () => {
    expect(validateEmailList('', { required: true })).toMatch(/required/i);
    expect(validateEmailList('owner@example.com', { required: true })).toBeNull();
    expect(validateEmailList('not-an-email', { required: true })).toMatch(/invalid/i);
  });
});
