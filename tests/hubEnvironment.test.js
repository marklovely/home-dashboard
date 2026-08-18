import { describe, expect, it, afterEach, vi } from 'vitest';
import {
  getHubEnvironmentSync,
  isVanillaHubEnvironment,
  resetHubEnvironmentForTests
} from '../src/auth/hubEnvironment.js';

describe('hubEnvironment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetHubEnvironmentForTests();
  });

  it('detects sandbox from build env', () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'sandbox');
    expect(getHubEnvironmentSync()).toBe('sandbox');
    expect(isVanillaHubEnvironment()).toBe(true);
  });

  it('treats staging as vanilla', () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'staging');
    expect(getHubEnvironmentSync()).toBe('staging');
    expect(isVanillaHubEnvironment()).toBe(true);
  });

  it('recognizes platform site ids like demo as non-production vanilla stacks', () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'demo');
    expect(getHubEnvironmentSync()).toBe('demo');
    expect(isVanillaHubEnvironment()).toBe(true);
  });

  it('detects demo from hostname', () => {
    resetHubEnvironmentForTests();
    vi.stubGlobal('location', { hostname: 'demo.lovely-home.co.uk' });
    expect(getHubEnvironmentSync()).toBe('demo');
    expect(isVanillaHubEnvironment()).toBe(true);
    resetHubEnvironmentForTests();
    vi.unstubAllGlobals();
  });
});
