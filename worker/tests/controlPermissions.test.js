import { describe, expect, it } from 'vitest';
import { CONTROL_PERMISSIONS, isControlAllowedForRole } from '../src/lib/controlPermissions.js';

describe('controlPermissions', () => {
  it('allows owners on all configured buttons', () => {
    for (const code of Object.keys(CONTROL_PERMISSIONS)) {
      expect(isControlAllowedForRole(code, 'owner')).toBe(true);
    }
  });

  it('forbids house sitters from every control', () => {
    for (const code of Object.keys(CONTROL_PERMISSIONS)) {
      expect(isControlAllowedForRole(code, 'house-sitter')).toBe(false);
    }
  });

  it('rejects unknown button codes', () => {
    expect(isControlAllowedForRole('VB99', 'owner')).toBe(false);
  });
});
