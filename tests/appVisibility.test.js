import '../src/apps/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetUserModeForTests, setUserMode, UserMode } from '../src/auth/userMode.js';
import { getVisibleApps, isAppVisible } from '../src/services/appVisibility.js';
import {
  applySitterControlsEffective,
  resetSitterControlsForTests
} from '../src/services/sitterControlsService.js';

describe('appVisibility sitter controls', () => {
  afterEach(() => {
    resetUserModeForTests();
    resetSitterControlsForTests();
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
