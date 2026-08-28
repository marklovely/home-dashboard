import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { filterAppsForEnvironment, isAppEnabledForEnvironment } from '../src/services/environmentAppPolicy.js';
import { resetHubEnvironmentForTests } from '../src/auth/hubEnvironment.js';

describe('environmentAppPolicy demo hub', () => {
  beforeEach(() => {
    resetHubEnvironmentForTests();
    vi.stubGlobal('location', { hostname: 'demo.lovely-home.co.uk' });
  });

  afterEach(() => {
    resetHubEnvironmentForTests();
    vi.unstubAllGlobals();
  });

  it('hides controls and cameras but keeps pet care on demo', () => {
    const apps = [
      { id: 'home', label: 'Home' },
      { id: 'controls', label: 'Controls' },
      { id: 'cameras', label: 'Cameras' },
      { id: 'scooter', label: 'Pet care' }
    ];
    const visible = filterAppsForEnvironment(apps).map((app) => app.id);
    expect(visible).toContain('home');
    expect(visible).toContain('scooter');
    expect(visible).not.toContain('controls');
    expect(visible).not.toContain('cameras');
    expect(isAppEnabledForEnvironment({ id: 'scooter', label: 'Pet care' })).toBe(true);
  });
});
