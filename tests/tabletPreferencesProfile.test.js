import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TABLET_PREFERENCES,
  isDefaultTabletPreferences,
  readLocalTabletPreferencesFromStorage,
  readTabletPreferencesFromProfile,
  tabletPreferencesEqual
} from '../src/lib/tabletPreferencesProfile.js';

describe('tabletPreferencesProfile', () => {
  it('returns defaults when profile is missing tablet preferences', () => {
    expect(readTabletPreferencesFromProfile({})).toEqual(DEFAULT_TABLET_PREFERENCES);
  });

  it('normalizes invalid stored values', () => {
    expect(
      readTabletPreferencesFromProfile({
        tabletPreferences: {
          theme: 'neon',
          clockFormat: '48',
          homeScreenScale: '2',
          screensaver: 'maybe',
          screensaverTimeoutMinutes: 99,
          dismissedBinCollectionDate: 'not-a-date'
        }
      })
    ).toEqual(DEFAULT_TABLET_PREFERENCES);
  });

  it('reads valid tablet preferences from profile', () => {
    expect(
      readTabletPreferencesFromProfile({
        tabletPreferences: {
          theme: 'light',
          clockFormat: '12',
          homeScreenScale: '1.2',
          screensaver: 'off',
          screensaverTimeoutMinutes: 30,
          dismissedBinCollectionDate: '2026-07-31'
        }
      })
    ).toEqual({
      theme: 'light',
      clockFormat: '12',
      homeScreenScale: '1.2',
      screensaver: 'off',
      screensaverTimeoutMinutes: 30,
      dismissedBinCollectionDate: '2026-07-31'
    });
  });

  it('reads legacy localStorage values for migration', () => {
    localStorage.setItem('home-hub-theme', 'auto');
    localStorage.setItem('home-hub-clock-format', '12');
    localStorage.setItem('home-hub-home-scale', '1.1');
    localStorage.setItem('home-hub-screensaver', 'off');
    localStorage.setItem('home-hub-screensaver-timeout-minutes', '5');
    localStorage.setItem(
      'home-dashboard-bin-alert-dismissed',
      JSON.stringify({ collectionDate: '2026-08-01' })
    );

    expect(readLocalTabletPreferencesFromStorage()).toEqual({
      theme: 'auto',
      clockFormat: '12',
      homeScreenScale: '1.1',
      screensaver: 'off',
      screensaverTimeoutMinutes: 5,
      dismissedBinCollectionDate: '2026-08-01'
    });
  });

  it('detects default and equal preferences', () => {
    expect(isDefaultTabletPreferences(DEFAULT_TABLET_PREFERENCES)).toBe(true);
    expect(
      tabletPreferencesEqual(DEFAULT_TABLET_PREFERENCES, readTabletPreferencesFromProfile({}))
    ).toBe(true);
    expect(
      tabletPreferencesEqual(DEFAULT_TABLET_PREFERENCES, {
        ...DEFAULT_TABLET_PREFERENCES,
        theme: 'light'
      })
    ).toBe(false);
  });
});
