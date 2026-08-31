import { describe, expect, it } from 'vitest';
import { shouldShowTrialWatermark } from '../src/services/hubTrialStatus.js';
import { isWallTabletDisplay } from '../src/lib/wallTabletDisplay.js';

describe('trial watermark visibility', () => {
  it('shows on a wall tablet during trial', () => {
    expect(
      shouldShowTrialWatermark({ trialing: true, wallTablet: true, sitterMode: false, demoHub: false })
    ).toBe(true);
  });

  it('shows in sitter mode during trial even off the tablet', () => {
    expect(
      shouldShowTrialWatermark({ trialing: true, wallTablet: false, sitterMode: true, demoHub: false })
    ).toBe(true);
  });

  it('hides on an owner laptop during trial', () => {
    expect(
      shouldShowTrialWatermark({ trialing: true, wallTablet: false, sitterMode: false, demoHub: false })
    ).toBe(false);
  });

  it('never shows on the public demo', () => {
    expect(
      shouldShowTrialWatermark({ trialing: true, wallTablet: true, sitterMode: true, demoHub: true })
    ).toBe(false);
  });

  it('detects Fully Kiosk user agents as a wall tablet', () => {
    expect(isWallTabletDisplay({ userAgent: 'Mozilla/5.0 Fully Kiosk Browser' })).toBe(true);
    expect(
      isWallTabletDisplay({
        userAgent: 'Mozilla/5.0',
        matchMedia: (query) => ({
          matches: query.includes('standalone') || query.includes('min-width')
        })
      })
    ).toBe(true);
    expect(isWallTabletDisplay({ userAgent: 'Mozilla/5.0' })).toBe(false);
  });
});
