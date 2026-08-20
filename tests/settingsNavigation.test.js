import { describe, expect, it } from 'vitest';
import {
  getSettingsSections,
  normalizeSettingsPanel
} from '../src/apps/Settings/settingsNavigation.js';

describe('settingsNavigation', () => {
  it('returns owner sections including home details, utilities, and bins', () => {
    const sections = getSettingsSections(true).map((section) => section.id);
    expect(sections).toContain('home-details');
    expect(sections).toContain('utilities');
    expect(sections).toContain('bins');
    expect(sections).toContain('appearance');
    expect(sections).not.toContain('backup');
  });

  it('returns shared sections only for sitter mode', () => {
    const sections = getSettingsSections(false).map((section) => section.id);
    expect(sections).toEqual(['appearance', 'help', 'about']);
  });

  it('falls back to appearance for unknown panels', () => {
    expect(normalizeSettingsPanel('missing-panel', true)).toBe('appearance');
    expect(normalizeSettingsPanel('home-details', false)).toBe('appearance');
    expect(normalizeSettingsPanel('backup', true)).toBe('utilities');
  });
});
