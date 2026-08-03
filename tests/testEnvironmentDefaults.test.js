import '../src/apps/index.js';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { resetHubEnvironmentForTests } from '../src/auth/hubEnvironment.js';
import { getHubConfig } from '../src/config/resolveHubConfig.js';
import { getCollectionInformationCopy } from '../src/apps/Bins/binCollectionCopy.js';
import {
  getScheduleMetadata,
  __buildAllCollectionEventsForTests
} from '../src/services/binCollectionService.js';
import { getVisibleApps, isAppVisible } from '../src/services/appVisibility.js';
import {
  canFetchMyDayCalendar,
  getMyDayHomeSummary,
  refreshMyDayCalendar
} from '../src/services/myDayCalendarService.js';
import { getActiveGuideCatalog } from '../src/services/guideContentService.js';
import { buildEmergencyCards } from '../src/apps/Emergency/emergencyCards.js';
import { resetUserModeForTests, setUserMode, UserMode } from '../src/auth/userMode.js';
import { setActiveProfileId } from '../src/services/profileService.js';

describe('test environment vanilla defaults', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetHubEnvironmentForTests();
    resetUserModeForTests();
    setActiveProfileId('owner');
  });

  it('uses empty Virtual Button config in test', () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'test');
    expect(getHubConfig().buttons).toEqual([]);
    expect(getHubConfig().buttonGroups).toEqual([]);
  });

  it('hides Controls from visible apps in test', () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'test');
    setUserMode(UserMode.HouseSitter);
    setActiveProfileId('housesitter');
    const ids = getVisibleApps().map((app) => app.id);
    expect(ids).not.toContain('controls');
    expect(ids).toContain('bins');
    expect(isAppVisible('controls')).toBe(false);
    expect(isAppVisible('bins')).toBe(true);
  });

  it('serves demo bin schedule copy and metadata in test', () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'test');
    const copy = getCollectionInformationCopy();
    expect(copy.title).toContain('demo');
    const meta = getScheduleMetadata();
    expect(meta.household.source).toBe('Demo schedule');
    expect(__buildAllCollectionEventsForTests().length).toBeGreaterThan(0);
  });

  it('does not fetch personal calendar in test and shows setup summary', async () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'test');
    setUserMode(UserMode.Owner);
    expect(canFetchMyDayCalendar()).toBe(false);
    const state = await refreshMyDayCalendar();
    expect(state.status).toBe('setup');
    expect(getMyDayHomeSummary().subtitle).toContain('Setup guide');
  });

  it('hides Scooter app and uses neutral guide fallback in test', () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'test');
    setUserMode(UserMode.HouseSitter);
    setActiveProfileId('housesitter');
    expect(isAppVisible('scooter')).toBe(false);
    expect(getVisibleApps().map((app) => app.id)).not.toContain('scooter');
    const catalog = getActiveGuideCatalog();
    expect(JSON.stringify(catalog)).not.toContain('Scooter');
    expect(catalog.categories?.some((category) => category.id === 'scooter')).toBe(false);
  });

  it('builds vanilla Emergency cards without production names on test', () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'test');
    resetHubEnvironmentForTests();
    const labels = buildEmergencyCards()
      .map((card) => card.label)
      .join(' ');
    expect(labels).toContain('Primary contact');
    expect(labels).not.toMatch(/Mark|Donna|Scooter|Vets 4 Pets/i);
  });
});
