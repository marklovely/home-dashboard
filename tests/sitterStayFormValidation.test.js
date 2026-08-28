import { describe, expect, it } from 'vitest';
import { parseSitterStayEmails, validateSitterStayForm } from '../src/lib/sitterStayFormValidation.js';

describe('sitterStayFormValidation', () => {
  it('parses comma and newline separated emails', () => {
    expect(parseSitterStayEmails('a@example.com, b@example.com')).toEqual([
      'a@example.com',
      'b@example.com'
    ]);
  });

  it('requires emails and both dates', () => {
    const result = validateSitterStayForm({ emails: '', sitStart: '', sitEnd: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.emails).toBeTruthy();
      expect(result.fieldErrors.sitStart).toBeTruthy();
      expect(result.fieldErrors.sitEnd).toBeTruthy();
    }
  });

  it('rejects end date before start date', () => {
    const result = validateSitterStayForm({
      emails: 'sitter@example.com',
      sitStart: '2026-03-20',
      sitEnd: '2026-03-12'
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.sitEnd).toMatch(/on or after/i);
    }
  });

  it('accepts a valid stay form', () => {
    expect(
      validateSitterStayForm({
        emails: 'sitter@example.com',
        sitStart: '2026-03-12',
        sitEnd: '2026-03-19'
      }).ok
    ).toBe(true);
  });
});
