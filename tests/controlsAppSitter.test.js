import '../src/apps/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountControlsApp } from '../src/apps/Controls/ControlsApp.js';
import { CONFIG } from '../src/config.js';
import { resetUserModeForTests, setUserMode, UserMode } from '../src/auth/userMode.js';
import {
  applySitterControlsEffective,
  resetSitterControlsForTests
} from '../src/services/sitterControlsService.js';

describe('controls app in guest mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetUserModeForTests();
    resetSitterControlsForTests();
  });

  it('mounts grouped routines like owner when controls are disclosed', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    setUserMode(UserMode.HouseSitter);
    applySitterControlsEffective(true);

    const viewport = document.createElement('div');
    const context = {
      config: CONFIG,
      toast: document.createElement('div'),
      lastCommand: document.createElement('span'),
      navigate: vi.fn()
    };

    mountControlsApp(viewport, context);

    const page = viewport.querySelector('.controls-app');
    expect(page).toBeTruthy();
    expect(viewport.querySelector('.controls-unconfigured')).toBeNull();
    expect(viewport.querySelectorAll('.control-button-group')).toHaveLength(CONFIG.buttonGroups.length);
    expect(viewport.querySelectorAll('.routine-button')).toHaveLength(CONFIG.buttons.length);
  });
});
