import { describe, expect, it } from 'vitest';
import {
  isButtonAllowedForSitter,
  SITTER_ALLOWED_BUTTON_IDS
} from '../src/config/controlPermissions.js';

describe('controlPermissions', () => {
  it('allows garage, downstairs off, and watch movie for sitters', () => {
    expect(SITTER_ALLOWED_BUTTON_IDS).toContain(3);
    expect(SITTER_ALLOWED_BUTTON_IDS).toContain(4);
    expect(SITTER_ALLOWED_BUTTON_IDS).toContain(5);
    expect(SITTER_ALLOWED_BUTTON_IDS).toContain(6);
  });

  it('keeps heating owner-only', () => {
    expect(isButtonAllowedForSitter(7)).toBe(false);
  });
});
