import { describe, expect, it, vi, afterEach } from 'vitest';
import { getAppDisplayTitle } from '../src/modes/modeConfig.js';
import { resetUserModeForTests } from '../src/auth/userMode.js';
import { resetSiteProfileStateForTests, setSiteProfileStateForTests } from '../src/services/siteProfileService.js';

describe('getAppDisplayTitle pet care', () => {
  afterEach(() => {
    resetUserModeForTests();
    resetSiteProfileStateForTests();
    vi.unstubAllEnvs();
  });

  it('uses the pet name from site profile for the scooter app', () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'demo');
    setSiteProfileStateForTests({
      profile: {
        petCare: {
          hasPets: true,
          name: 'Bailey',
          species: 'Jack Russell'
        }
      },
      loaded: true
    });

    expect(getAppDisplayTitle({ id: 'scooter', title: 'Pet care' })).toBe('Bailey');
  });

  it('falls back when no pet name is configured', () => {
    setSiteProfileStateForTests({ profile: { petCare: { hasPets: false } }, loaded: true });
    expect(getAppDisplayTitle({ id: 'scooter', title: 'Pet care' })).toBe('Pet care');
  });
});
