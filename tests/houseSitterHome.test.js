import '../src/apps/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHouseSitterHome } from '../src/apps/Home/renderHouseSitterHome.js';
import { getVisibleApps } from '../src/services/appVisibility.js';
import { resetUserModeForTests } from '../src/auth/userMode.js';
import {
  resetSiteProfileStateForTests,
  setSiteProfileStateForTests
} from '../src/services/siteProfileService.js';

describe('house sitter home layout', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    resetUserModeForTests();
    resetSiteProfileStateForTests();
  });

  it('structures the guest home with essentials, useful information, and help', async () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    setSiteProfileStateForTests({
      profile: { hubName: 'Smith Home', petCare: { hasPets: true, name: 'Bailey' } },
      loaded: true
    });

    const viewport = document.createElement('div');
    const context = {
      config: { buttons: [{ id: 1 }, { id: 2 }] },
      toast: document.createElement('div'),
      lastCommand: document.createElement('span'),
      navigate: vi.fn()
    };

    await renderHouseSitterHome(viewport, getVisibleApps(), context);

    const page = viewport.querySelector('.home-screen--sitter');
    expect(page).toBeTruthy();
    expect(page?.querySelector('.sitter-welcome-card')).toBeTruthy();
    expect(page?.querySelector('.sitter-welcome-title')?.textContent).toBe('Welcome to Smith Home');
    expect(page?.querySelector('.sitter-welcome-lead')?.textContent).toMatch(/Bailey/);
    expect(page?.querySelector('.sitter-welcome-body')?.textContent).not.toMatch(/House Guide/i);

    const sectionTitles = [...(page?.querySelectorAll('.sitter-section-title') ?? [])].map(
      (el) => el.textContent
    );
    expect(sectionTitles).toEqual(['Essentials', 'Useful information']);

    const essentialCards = page?.querySelectorAll('.home-launcher-card--essential') ?? [];
    expect(essentialCards).toHaveLength(4);
    expect([...essentialCards].map((card) => card.querySelector('.home-launcher-title')?.textContent)).toEqual([
      'Bailey',
      'House Guide',
      'Home Controls',
      'Emergency'
    ]);

    const infoCards = page?.querySelectorAll('.sitter-info-card') ?? [];
    expect(infoCards).toHaveLength(2);

    const helpButtons = [...(page?.querySelectorAll('.sitter-help-button') ?? [])];
    expect(helpButtons.map((button) => button.textContent?.trim())).toEqual([
      'Tablet guide',
      'Open House Guide'
    ]);

    const houseGuideButton = helpButtons.find((button) => /Open House Guide/.test(button.textContent ?? ''));
    houseGuideButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(context.navigate).toHaveBeenCalledWith('house-guide');
  });

  it('shows a bin alert banner when the next collection is within the reminder window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T10:00:00'));
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();

    const viewport = document.createElement('div');
    const context = {
      config: { buttons: [{ id: 1 }, { id: 2 }] },
      toast: document.createElement('div'),
      lastCommand: document.createElement('span'),
      navigate: vi.fn()
    };

    await renderHouseSitterHome(viewport, getVisibleApps(), context);

    const banner = viewport.querySelector('.bin-alert-banner');
    expect(banner).toBeTruthy();
    expect(banner?.querySelector('.bin-alert-banner-title')?.textContent).toMatch(/tomorrow/i);
    expect(banner?.querySelector('.bin-alert-banner-meta')?.textContent).toMatch(/Put bins out by 6am/i);

    banner?.querySelector('.bin-alert-banner-main')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(context.navigate).toHaveBeenCalledWith('bins');

    expect(banner?.querySelector('.bin-alert-banner-dismiss')).toBeTruthy();

    const binsCard = viewport.querySelector('.sitter-info-card--alert');
    expect(binsCard).toBeTruthy();
  });
});
