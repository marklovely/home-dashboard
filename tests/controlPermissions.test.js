import { describe, expect, it, afterEach } from 'vitest';
import {
  applySitterControlsEffective,
  isSitterControlsDisclosed,
  resetSitterControlsForTests
} from '../src/services/sitterControlsService.js';
import { isButtonAllowedForSitter } from '../src/config/controlPermissions.js';

describe('controlPermissions', () => {
  afterEach(() => {
    resetSitterControlsForTests();
  });

  it('blocks sitter buttons until controls are disclosed for an active sit', () => {
    expect(isSitterControlsDisclosed()).toBe(false);
    for (const buttonId of [1, 2, 8, 10]) {
      expect(isButtonAllowedForSitter(buttonId)).toBe(false);
    }

    applySitterControlsEffective(true);
    for (const buttonId of [1, 2, 8, 10]) {
      expect(isButtonAllowedForSitter(buttonId)).toBe(true);
    }
  });
});
