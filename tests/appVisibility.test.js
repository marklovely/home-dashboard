import '../src/apps/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetUserModeForTests, setUserMode, UserMode } from '../src/auth/userMode.js';
import { getVisibleApps, isAppVisible } from '../src/services/appVisibility.js';
import {
  applySitterControlsEffective,
  resetSitterControlsForTests
} from '../src/services/sitterControlsService.js';
import * as siteProfileService from '../src/services/siteProfileService.js';

describe('appVisibility sitter controls', () => {
  afterEach(() => {
    resetUserModeForTests();
    resetSitterControlsForTests();
  });

  it('hides arrival prep for owner-only hubs', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    setUserMode(UserMode.Owner);
    vi.spyOn(siteProfileService, 'getSiteProfileState').mockReturnValue({
      profile: { useCase: 'owner' }
    });

    expect(getVisibleApps().some((app) => app.id === 'arrival-prep')).toBe(false);
    expect(isAppVisible('arrival-prep')).toBe(false);
  });

  it('shows arrival prep for sitter use cases', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    setUserMode(UserMode.Owner);
    vi.spyOn(siteProfileService, 'getSiteProfileState').mockReturnValue({
      profile: { useCase: 'housesitter' }
    });

    expect(getVisibleApps().some((app) => app.id === 'arrival-prep')).toBe(true);
    expect(isAppVisible('arrival-prep')).toBe(true);
  });

  it('hides controls for guests until sitter controls are disclosed', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    setUserMode(UserMode.HouseSitter);

    expect(getVisibleApps().some((app) => app.id === 'controls')).toBe(false);
    expect(isAppVisible('controls')).toBe(false);

    applySitterControlsEffective(true);

    expect(getVisibleApps().some((app) => app.id === 'controls')).toBe(true);
    expect(isAppVisible('controls')).toBe(true);
  });
});
