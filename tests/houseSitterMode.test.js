import '../src/apps/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getModeConfig, getAppDisplayTitle } from '../src/modes/modeConfig.js';
import { getVisibleApps, isAppVisible } from '../src/services/appVisibility.js';
import { getAppById } from '../src/services/appRegistry.js';
import {
  UserMode,
  resetUserModeForTests,
  setUserMode
} from '../src/auth/userMode.js';
import { setActiveProfileId } from '../src/services/profileService.js';

describe('house sitter mode configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetUserModeForTests();
    setActiveProfileId('owner');
  });

  it('uses Lovely Home branding in house sitter user mode', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    const config = getModeConfig();
    expect(config.branding.eyebrow).toBe('LOVELY HOME');
    expect(config.branding.homeTagline).toBeNull();
    expect(config.sitterEssentialAppIds).toEqual([
      'scooter',
      'house-guide',
      'controls',
      'emergency'
    ]);
    expect(config.showSitterHeaderWeather).toBe(true);
  });

  it('keeps owner branding in owner user mode on home deployment', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    setUserMode(UserMode.Owner);
    const config = getModeConfig();
    expect(config.branding.eyebrow).toBe('LOVELY HOME HUB');
  });

  it('shows only sitter apps in house sitter user mode', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    const ids = getVisibleApps().map((app) => app.id);
    expect(ids).not.toContain('settings');
    expect(ids).not.toContain('plex');
  });

  it('includes owner apps for owner user mode on home deployment', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    setUserMode(UserMode.Owner);
    setActiveProfileId('owner');
    const ids = getVisibleApps().map((app) => app.id);
    expect(ids).toContain('settings');
    expect(ids).toContain('plex');
    expect(ids).not.toContain('emergency');
    expect(ids).not.toContain('house-guide');
    expect(ids).not.toContain('scooter');
    expect(isAppVisible('emergency')).toBe(false);
    expect(isAppVisible('house-guide')).toBe(false);
    expect(isAppVisible('scooter')).toBe(false);
  });

  it('defines bottom navigation for house sitter experience', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    const nav = getModeConfig().bottomNav ?? [];
    expect(nav.map((item) => item.route)).toEqual(['home', 'house-guide', 'emergency']);
  });

  it('registers emergency app routing target', () => {
    expect(getAppById('emergency')?.title).toBe('Emergency');
  });

  it('renames controls for house sitter display', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    const controls = getAppById('controls');
    expect(getAppDisplayTitle(controls)).toBe('Home Controls');
  });
});
