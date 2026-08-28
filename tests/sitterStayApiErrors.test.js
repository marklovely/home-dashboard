import { describe, expect, it } from 'vitest';
import { sitterStayApiErrorMessage } from '../src/lib/sitterStayApiErrors.js';

describe('sitterStayApiErrorMessage', () => {
  it('reads nested Worker error message', () => {
    expect(
      sitterStayApiErrorMessage(
        { error: { code: 'NOT_FOUND', message: 'Route not found.' } },
        'fallback'
      )
    ).toBe('Route not found.');
  });

  it('falls back when no message is present', () => {
    expect(sitterStayApiErrorMessage({}, 'Could not schedule sitter stay.')).toBe(
      'Could not schedule sitter stay.'
    );
  });
});
