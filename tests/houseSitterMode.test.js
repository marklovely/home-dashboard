import '../src/apps/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppMode, getAppMode } from '../src/modes/appMode.js';
import { getModeConfig, getAppDisplayTitle, isHouseSitterMode } from '../src/modes/modeConfig.js';
import { getVisibleApps, isAppVisible } from '../src/services/appVisibility.js';
import { getAppById } from '../src/services/appRegistry.js';
import { setActiveProfileId } from '../src/services/profileService.js';

describe('app mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    setActiveProfileId('owner');
  });

  it('defaults to owner mode', () => {
    vi.stubEnv('VITE_APP_MODE', '');
    expect(getAppMode()).toBe(AppMode.Owner);
    expect(isHouseSitterMode()).toBe(false);
  });

  it('enables house sitter mode from VITE_APP_MODE', () => {
    vi.stubEnv('VITE_APP_MODE', 'house-sitter');
    expect(getAppMode()).toBe(AppMode.HouseSitter);
    expect(isHouseSitterMode()).toBe(true);
  });
});

describe('house sitter mode configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    setActiveProfileId('owner');
  });

  it('uses Lovely Home branding in house sitter mode', () => {
    vi.stubEnv('VITE_APP_MODE', 'house-sitter');
    const config = getModeConfig();
    expect(config.branding.eyebrow).toBe('LOVELY HOME');
    expect(config.branding.homeChromeTitle).toBe('Lovely Home');
    expect(config.branding.homeTagline).toMatch(/during your stay/i);
  });

  it('keeps owner branding in owner mode', () => {
    vi.stubEnv('VITE_APP_MODE', 'owner');
    const config = getModeConfig();
    expect(config.branding.eyebrow).toBe('LOVELY HOME HUB');
    expect(config.branding.homeChromeTitle).toBe('Home Hub');
  });

  it('shows only sitter apps on home in house sitter mode', () => {
    vi.stubEnv('VITE_APP_MODE', 'house-sitter');
    const ids = getVisibleApps().map((app) => app.id);
    expect(ids).toEqual(['weather', 'scooter', 'house-guide', 'controls', 'bins', 'emergency']);
    expect(ids).not.toContain('settings');
    expect(ids).not.toContain('plex');
    expect(ids).not.toContain('calendar');
  });

  it('includes owner apps for owner profile in owner mode', () => {
    vi.stubEnv('VITE_APP_MODE', '');
    setActiveProfileId('owner');
    const ids = getVisibleApps().map((app) => app.id);
    expect(ids).toContain('settings');
    expect(ids).toContain('plex');
    expect(isAppVisible('emergency')).toBe(false);
  });

  it('defines bottom navigation for house sitter mode', () => {
    vi.stubEnv('VITE_APP_MODE', 'house-sitter');
    const nav = getModeConfig().bottomNav ?? [];
    expect(nav.map((item) => item.route)).toEqual(['home', 'house-guide', 'emergency']);
  });

  it('registers emergency app routing target', () => {
    expect(getAppById('emergency')?.title).toBe('Emergency');
  });

  it('renames controls for house sitter display', () => {
    vi.stubEnv('VITE_APP_MODE', 'house-sitter');
    const controls = getAppById('controls');
    expect(controls).toBeTruthy();
    expect(getAppDisplayTitle(controls)).toBe('Home Controls');
  });
});
