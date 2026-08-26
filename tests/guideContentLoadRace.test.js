import { afterEach, describe, expect, it, vi } from 'vitest';
import * as houseGuideApi from '../src/api/houseGuideApi.js';
import { getBundledSiteCatalog } from '../src/content/houseguide/providers/jsonGuideProvider.js';
import * as jsonGuideProvider from '../src/content/houseguide/providers/jsonGuideProvider.js';
import * as deviceSessionStore from '../src/auth/deviceSessionStore.js';
import * as hubEnvironment from '../src/auth/hubEnvironment.js';
import * as guideService from '../src/services/guideService.js';
import {
  refreshGuideContent,
  resetGuideContentStateForTests
} from '../src/services/guideContentService.js';
import { houseGuideWidget } from '../src/widgets/HouseGuide/HouseGuideWidget.js';
import { mountScooterApp } from '../src/apps/Scooter/ScooterApp.js';

describe('guide content load race', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetGuideContentStateForTests();
  });

  it('rebuilds the house guide grid when the remote catalog arrives after mount', async () => {
    vi.spyOn(deviceSessionStore, 'getDeviceSessionStatus').mockReturnValue('ready');
    vi.spyOn(hubEnvironment, 'isTestHubEnvironment').mockReturnValue(true);

    vi.spyOn(jsonGuideProvider, 'getFallbackGuideCatalog').mockReturnValue({
      version: 2,
      homeSummaryTitle: 'House Guide',
      homeSummarySubtitle: 'Loading…',
      media: {},
      categories: [
        {
          id: 'placeholder',
          title: 'Loading',
          cardSubtitle: 'Please wait',
          iconId: 'book-open',
          accent: '#6ea8ff',
          topics: []
        }
      ]
    });

    /** @type {(value: Awaited<ReturnType<typeof houseGuideApi.fetchHouseGuideCatalog>>) => void} */
    let resolveCatalog;
    const catalogPromise = new Promise((resolve) => {
      resolveCatalog = resolve;
    });
    vi.spyOn(houseGuideApi, 'fetchHouseGuideCatalog').mockReturnValue(
      /** @type {ReturnType<typeof houseGuideApi.fetchHouseGuideCatalog>} */ (catalogPromise)
    );

    resetGuideContentStateForTests();

    const context = {
      config: { buttons: [] },
      toast: document.createElement('div'),
      lastCommand: document.createElement('div'),
      navigate: vi.fn()
    };

    const root = houseGuideWidget.mount(context);
    expect(root.querySelectorAll('.guide-category-card')).toHaveLength(1);

    resolveCatalog({
      ok: true,
      status: 200,
      message: '',
      data: { seeded: true, draftCount: 0, catalog: getBundledSiteCatalog() }
    });
    await catalogPromise;

    await vi.waitFor(() => {
      expect(root.querySelectorAll('.guide-category-card').length).toBeGreaterThan(1);
    });
  });

  it('opens a pet care topic when the catalog arrives after an early tap', async () => {
    const morningTopic = {
      id: 'morning-routine',
      title: 'Morning routine',
      subtitle: 'First thing',
      summary: 'Morning',
      searchTerms: [],
      blocks: [{ type: 'text', content: 'Let Bailey out into the garden.' }],
      actions: [],
      audience: 'guest'
    };

    vi.spyOn(deviceSessionStore, 'getDeviceSessionStatus').mockReturnValue('ready');
    vi.spyOn(houseGuideApi, 'fetchHouseGuideCatalog').mockResolvedValue({
      ok: true,
      status: 200,
      message: '',
      data: { seeded: true, draftCount: 0, catalog: getBundledSiteCatalog() }
    });

    vi.spyOn(guideService, 'getGuideTopic')
      .mockReturnValueOnce(undefined)
      .mockReturnValue(morningTopic);

    resetGuideContentStateForTests();

    const viewport = document.createElement('div');
    const context = {
      config: { buttons: [] },
      toast: document.createElement('div'),
      lastCommand: document.createElement('div'),
      navigate: vi.fn()
    };

    mountScooterApp(viewport, context);
    viewport.querySelector('.scooter-section-card')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(viewport.querySelector('.scooter-detail-host')?.hidden).toBe(true);

    await refreshGuideContent(fetch, { draft: false, force: true });

    await vi.waitFor(() => {
      expect(viewport.querySelector('.scooter-detail-host')?.hidden).toBe(false);
    });
    expect(viewport.querySelector('.guide-topic-title')?.textContent).toMatch(/morning/i);
  });
});
