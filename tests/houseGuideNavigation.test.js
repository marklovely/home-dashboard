import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/apps/index.js';
import {
  getCurrentRoute,
  initRouter,
  navigate,
  resetRouterForTests
} from '../src/shell/router.js';
import { getAppById } from '../src/services/appRegistry.js';
import { houseGuideWidget } from '../src/widgets/HouseGuide/HouseGuideWidget.js';

describe('house guide topic navigation', () => {
  beforeEach(() => {
    resetRouterForTests();
    window.history.replaceState({}, '', '/');
    window.location.hash = '';
  });

  afterEach(() => {
    resetRouterForTests();
    window.location.hash = '';
  });

  it('keeps the wifi connecting topic open when the guide topic hash changes', () => {
    initRouter(getAppById);
    navigate('house-guide');

    const context = {
      config: { buttons: [] },
      toast: document.createElement('div'),
      lastCommand: document.createElement('div'),
      navigate
    };

    const root = houseGuideWidget.mount(context);
    navigate('house-guide', { guideTopicId: 'connecting' });

    const topicHost = root.querySelector('.house-guide-topic-host');
    expect(topicHost?.hidden).toBe(false);
    expect(topicHost?.textContent).toMatch(/Connecting/i);
    expect(root.querySelector('.house-guide-explore')?.hidden).toBe(true);
    expect(getCurrentRoute()).toBe('house-guide');
  });

  it('opens wifi category topics from the in-guide topic list', () => {
    initRouter(getAppById);
    navigate('house-guide');

    const context = {
      config: { buttons: [] },
      toast: document.createElement('div'),
      lastCommand: document.createElement('div'),
      navigate
    };

    const root = houseGuideWidget.mount(context);

    const wifiCard = [...root.querySelectorAll('.guide-category-card')].find((card) =>
      /Wi[-‑]?Fi/i.test(card.textContent ?? '')
    );
    expect(wifiCard).toBeTruthy();
    wifiCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const connectingLink = [...root.querySelectorAll('.guide-category-card')].find((node) =>
      /Connecting/i.test(node.textContent ?? '')
    );
    expect(connectingLink).toBeTruthy();
    connectingLink?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const topicHost = root.querySelector('.house-guide-topic-host');
    expect(topicHost?.hidden).toBe(false);
    expect(topicHost?.textContent).toMatch(/Connecting/i);
    expect(root.querySelector('.house-guide-explore')?.hidden).toBe(true);
  });
});
