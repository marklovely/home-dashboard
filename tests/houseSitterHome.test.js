import '../src/apps/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHouseSitterHome } from '../src/apps/Home/renderHouseSitterHome.js';
import { getVisibleApps } from '../src/services/appVisibility.js';
import { resetUserModeForTests } from '../src/auth/userMode.js';

describe('house sitter home layout', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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

    const helpButton = page?.querySelector('.sitter-help-button');
    expect(helpButton?.textContent).toMatch(/Open House Guide/);
    helpButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(context.navigate).toHaveBeenCalledWith('house-guide');
  });
});
