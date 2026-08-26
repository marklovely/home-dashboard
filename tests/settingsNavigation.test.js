import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  getSettingsSections,
  normalizeSettingsPanel
} from '../src/apps/Settings/settingsNavigation.js';
import { resetHubEnvironmentForTests } from '../src/auth/hubEnvironment.js';

describe('settingsNavigation', () => {
  it('returns owner sections including home details, utilities, bins, and cameras', () => {
    const sections = getSettingsSections(true).map((section) => section.id);
    expect(sections).toContain('home-details');
    expect(sections).toContain('utilities');
    expect(sections).toContain('bins');
    expect(sections).toContain('cameras');
    expect(sections).toContain('appearance');
    expect(sections).not.toContain('backup');
  });

  describe('demo hub', () => {
    beforeEach(() => {
      resetHubEnvironmentForTests();
      vi.stubGlobal('location', { hostname: 'demo.lovely-home.co.uk' });
    });

    afterEach(() => {
      resetHubEnvironmentForTests();
      vi.unstubAllGlobals();
    });

    it('hides guest mode, cameras, and utilities for owners', () => {
      const sections = getSettingsSections(true).map((section) => section.id);
      expect(sections).toContain('home-details');
      expect(sections).toContain('bins');
      expect(sections).not.toContain('guest-mode');
      expect(sections).not.toContain('cameras');
      expect(sections).not.toContain('utilities');
    });

    it('rejects hidden demo panels', () => {
      expect(normalizeSettingsPanel('utilities', true)).toBe('appearance');
      expect(normalizeSettingsPanel('cameras', true)).toBe('appearance');
    });
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
