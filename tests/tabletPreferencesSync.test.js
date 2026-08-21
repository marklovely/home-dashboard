import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetApiBaseForTests } from '../src/api/apiBase.js';
import { getActiveTheme, resetThemeForTests, setActiveTheme } from '../src/services/themeService.js';
import {
  getClockFormat,
  getHomeScreenScale,
  resetDisplayPreferencesForTests
} from '../src/services/displayPreferencesService.js';
import {
  getScreensaverSetting,
  getScreensaverTimeoutMinutes,
  resetScreensaverForTests
} from '../src/services/screensaverService.js';
import { resetBinAlertDismissalForTests } from '../src/services/binAlertDismissalService.js';
import {
  resetSiteProfileStateForTests,
  setSiteProfileStateForTests
} from '../src/services/siteProfileService.js';
import {
  getLastAppliedTabletPreferencesForTests,
  initTabletPreferencesSync,
  resetTabletPreferencesSyncForTests,
  syncTabletPreferencesFromSiteProfile
} from '../src/services/tabletPreferencesSyncService.js';

describe('tabletPreferencesSyncService', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test');
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );
    localStorage.clear();
    resetThemeForTests();
    resetDisplayPreferencesForTests();
    resetScreensaverForTests();
    resetBinAlertDismissalForTests();
    resetSiteProfileStateForTests();
    resetTabletPreferencesSyncForTests();
  });

  afterEach(() => {
    resetTabletPreferencesSyncForTests();
    resetSiteProfileStateForTests();
    resetThemeForTests();
    resetDisplayPreferencesForTests();
    resetScreensaverForTests();
    resetBinAlertDismissalForTests();
    resetApiBaseForTests();
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('applies tablet preferences from site profile on sync', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        ok: true,
        profile: {
          tabletPreferences: {
            theme: 'light',
            clockFormat: '12',
            homeScreenScale: '1.2',
            screensaver: 'off',
            screensaverTimeoutMinutes: 30,
            dismissedBinCollectionDate: null
          }
        },
        guideSeeded: false
      })
    );

    await syncTabletPreferencesFromSiteProfile(fetchMock);

    expect(getActiveTheme()).toBe('light');
    expect(getClockFormat()).toBe('12');
    expect(getHomeScreenScale()).toBe('1.2');
    expect(getScreensaverSetting()).toBe('off');
    expect(getScreensaverTimeoutMinutes()).toBe(30);
    expect(getLastAppliedTabletPreferencesForTests()?.theme).toBe('light');
  });

  it('migrates local tablet preferences when server still has defaults', async () => {
    localStorage.setItem('home-hub-theme', 'auto');
    localStorage.setItem('home-hub-clock-format', '12');

    const migratedProfile = {
      tabletPreferences: {
        theme: 'auto',
        clockFormat: '12',
        homeScreenScale: '1',
        screensaver: 'on',
        screensaverTimeoutMinutes: 15,
        dismissedBinCollectionDate: null
      }
    };

    const fetchMock = vi.fn(async (_url, init) => {
      if (init?.method === 'PATCH') {
        return Response.json({
          ok: true,
          profile: migratedProfile,
          guideSeeded: false
        });
      }

      return Response.json({
        ok: true,
        profile: { tabletPreferences: { theme: 'dark', clockFormat: '24' } },
        guideSeeded: false
      });
    });

    await syncTabletPreferencesFromSiteProfile(fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getActiveTheme()).toBe('auto');
    expect(getClockFormat()).toBe('12');
  });

  it('persists user preference changes to site profile', async () => {
    initTabletPreferencesSync();
    setSiteProfileStateForTests({
      profile: { tabletPreferences: { theme: 'dark', clockFormat: '24' } },
      guideSeeded: false
    });

    const fetchMock = vi.fn(async (_url, init) => {
      if (init?.method === 'PATCH') {
        return Response.json({
          ok: true,
          profile: {
            tabletPreferences: {
              theme: 'light',
              clockFormat: '24',
              homeScreenScale: '1',
              screensaver: 'on',
              screensaverTimeoutMinutes: 15,
              dismissedBinCollectionDate: null
            }
          },
          guideSeeded: false
        });
      }

      return Response.json({ ok: true, profile: {}, guideSeeded: false });
    });
    vi.stubGlobal('fetch', fetchMock);

    setActiveTheme('light');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    const patchBody = JSON.parse(String(patchCall?.[1]?.body));
    expect(patchBody.tabletPreferences.theme).toBe('light');
  });
});
