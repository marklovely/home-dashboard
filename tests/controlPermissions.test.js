import { describe, expect, it } from 'vitest';
import {
  isButtonAllowedForSitter,
  SITTER_ALLOWED_BUTTON_IDS
} from '../src/config/controlPermissions.js';

describe('controlPermissions', () => {
  it('does not allow any buttons for sitters', () => {
    expect(SITTER_ALLOWED_BUTTON_IDS).toEqual([]);
    for (const buttonId of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      expect(isButtonAllowedForSitter(buttonId)).toBe(false);
    }
  });
});
