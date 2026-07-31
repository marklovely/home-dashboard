import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/apps/index.js';
import {
  HOME_ROUTE,
  getCurrentRoute,
  getGuideTopicFromRoute,
  initRouter,
  navigate,
  resetRouterForTests
} from '../src/shell/router.js';
import { getAppById } from '../src/services/appRegistry.js';

describe('router guide deep links', () => {
  beforeEach(() => {
    resetRouterForTests();
    window.history.replaceState({}, '', '/');
    window.location.hash = '';
  });

  afterEach(() => {
    resetRouterForTests();
    window.location.hash = '';
  });

  it('parses guide topic ids from the hash', () => {
    window.location.hash = '#/house-guide/topic/scooter-bedtime';
    initRouter(getAppById);
    expect(getCurrentRoute()).toBe('house-guide');
    expect(getGuideTopicFromRoute()).toBe('scooter-bedtime');
  });

  it('navigates to a guide topic deep link', () => {
    initRouter(getAppById);
    navigate('house-guide', { guideTopicId: 'tv-source' });
    expect(getCurrentRoute()).toBe('house-guide');
    expect(getGuideTopicFromRoute()).toBe('tv-source');
    expect(window.location.hash).toBe('#/house-guide/topic/tv-source');
  });

  it('clears guide topic when opening house guide without a topic', () => {
    initRouter(getAppById);
    navigate('house-guide', { guideTopicId: 'tv-source' });
    navigate('house-guide');
    expect(getGuideTopicFromRoute()).toBeNull();
    expect(window.location.hash).toBe('#/house-guide');
  });

  it('returns home for unknown routes', () => {
    window.location.hash = '#/missing-app/topic/foo';
    initRouter(getAppById);
    expect(getCurrentRoute()).toBe(HOME_ROUTE);
    expect(getGuideTopicFromRoute()).toBeNull();
  });
});
