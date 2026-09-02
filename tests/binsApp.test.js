import { afterEach, describe, expect, it, vi } from 'vitest';
import { binsApp } from '../src/apps/Bins/BinsApp.js';
import { normalizeBinSchedule } from '../src/lib/binScheduleProfile.js';
import { resetSiteProfileStateForTests, setSiteProfileStateForTests } from '../src/services/siteProfileService.js';

function mountBins(profile) {
  setSiteProfileStateForTests({ profile });
  const viewport = document.createElement('div');
  binsApp.mount(viewport, {
    config: { buttons: [] },
    toast: document.createElement('div'),
    lastCommand: document.createElement('div'),
    navigate: vi.fn()
  });
  return viewport;
}

describe('Bins app calendar expiry', () => {
  afterEach(() => {
    resetSiteProfileStateForTests();
    vi.useRealTimers();
  });

  it('shows upcoming dates when validUntil is stale but later dates exist', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T15:00:00'));

    const viewport = mountBins({
      binSchedule: normalizeBinSchedule({
        validUntil: '2026-08-22',
        household: [
          { date: '2026-08-22', type: 'rubbish' },
          { date: '2026-09-04', type: 'rubbish' },
          { date: '2026-10-09', type: 'recycling' }
        ]
      })
    });

    expect(viewport.textContent).toMatch(/Next collection/);
    expect(viewport.textContent).toMatch(/2026-09-04|Friday 4 September/);
    expect(viewport.querySelector('.bins-expiry-panel')).toBeNull();
    expect(viewport.textContent).not.toMatch(/bin-collection-maintenance/);
    expect(viewport.textContent).not.toMatch(/October 2026/);
  });

  it('asks the owner to add dates without pointing at repo docs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T15:00:00'));

    const viewport = mountBins({
      binSchedule: normalizeBinSchedule({
        validUntil: '2026-08-22',
        household: [{ date: '2026-08-22', type: 'rubbish' }]
      })
    });

    expect(viewport.querySelector('.bins-expiry-panel')?.textContent).toMatch(
      /Collection calendar needs updating/
    );
    expect(viewport.textContent).toMatch(/Bin reminders/);
    expect(viewport.textContent).not.toMatch(/bin-collection-maintenance/);
    expect(viewport.textContent).not.toMatch(/October 2026/);
  });
});
