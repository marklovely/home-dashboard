import '../src/apps/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHouseSitterHome } from '../src/apps/Home/renderHouseSitterHome.js';
import { getVisibleApps } from '../src/services/appVisibility.js';
import { resetUserModeForTests } from '../src/auth/userMode.js';

describe('house sitter home layout', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    resetUserModeForTests();
  });

  it('structures the guest home with essentials, useful information, and help', async () => {
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

    const page = viewport.querySelector('.home-screen--sitter');
    expect(page).toBeTruthy();
    expect(page?.querySelector('.sitter-welcome-card')).toBeTruthy();
    expect(page?.querySelector('.sitter-welcome-body')?.textContent).not.toMatch(/House Guide/i);

    const sectionTitles = [...(page?.querySelectorAll('.sitter-section-title') ?? [])].map(
      (el) => el.textContent
    );
    expect(sectionTitles).toEqual(['Essentials', 'Useful information']);

    const essentialCards = page?.querySelectorAll('.home-launcher-card--essential') ?? [];
    expect(essentialCards).toHaveLength(4);
    expect([...essentialCards].map((card) => card.querySelector('.home-launcher-title')?.textContent)).toEqual([
      'Scooter',
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

    const banner = viewport.querySelector('.sitter-bin-alert');
    expect(banner).toBeTruthy();
    expect(banner?.querySelector('.sitter-bin-alert-title')?.textContent).toMatch(/tomorrow/i);

    banner?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(context.navigate).toHaveBeenCalledWith('bins');

    const binsCard = viewport.querySelector('.sitter-info-card--alert');
    expect(binsCard).toBeTruthy();
  });
});
