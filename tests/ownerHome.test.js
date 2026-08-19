import '../src/apps/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHomeScreen } from '../src/apps/Home/renderHome.js';
import { getVisibleApps } from '../src/services/appVisibility.js';
import { resetUserModeForTests } from '../src/auth/userMode.js';

describe('owner home layout', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    resetUserModeForTests();
  });

  it('shows a bin alert banner when the next collection is within the reminder window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T10:00:00'));
    resetUserModeForTests();

    const viewport = document.createElement('div');
    const context = {
      config: { buttons: [{ id: 1 }, { id: 2 }] },
      toast: document.createElement('div'),
      lastCommand: document.createElement('span'),
      navigate: vi.fn()
    };

    await renderHomeScreen(viewport, getVisibleApps(), context);

    const banner = viewport.querySelector('.bin-alert-banner');
    expect(banner).toBeTruthy();
    expect(banner?.querySelector('.bin-alert-banner-title')?.textContent).toMatch(/tomorrow/i);

    const metaLines = [...(banner?.querySelectorAll('.bin-alert-banner-meta') ?? [])].map(
      (el) => el.textContent
    );
    expect(metaLines.some((line) => /Put bins out by 6am/i.test(line ?? ''))).toBe(true);
    expect(metaLines.some((line) => /Collection point:/i.test(line ?? ''))).toBe(true);

    banner?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(context.navigate).toHaveBeenCalledWith('bins');
  });
});
