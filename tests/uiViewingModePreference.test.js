import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetHubEnvironmentForTests } from '../src/auth/hubEnvironment.js';
import {
  applyDeviceSessionMode,
  isOwnerUserMode,
  resetUserModeForTests
} from '../src/auth/userMode.js';
import {
  clearPersistedUiViewingMode,
  persistUiViewingMode,
  readPersistedUiViewingMode,
  resolveUiViewingModeForDeviceSession
} from '../src/auth/uiViewingModePreference.js';

describe('uiViewingModePreference', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetUserModeForTests();
    resetHubEnvironmentForTests();
    clearPersistedUiViewingMode();
  });

  it('defaults demo hubs to owner viewing mode', () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'demo');
    resetHubEnvironmentForTests();
    expect(resolveUiViewingModeForDeviceSession('sitter')).toBe('owner');
  });

  it('restores persisted viewing mode on demo refresh', () => {
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'demo');
    resetHubEnvironmentForTests();
    persistUiViewingMode('house-sitter');
    expect(readPersistedUiViewingMode()).toBe('house-sitter');
    expect(resolveUiViewingModeForDeviceSession('sitter')).toBe('house-sitter');
  });

  it('forces guest mode on a sitter-locked production tablet', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    persistUiViewingMode('owner');
    applyDeviceSessionMode('sitter');
    expect(isOwnerUserMode()).toBe(false);
    expect(readPersistedUiViewingMode()).toBeNull();
  });

  it('restores owner viewing mode on demo refresh after profile switch', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'demo');
    resetHubEnvironmentForTests();
    persistUiViewingMode('owner');
    applyDeviceSessionMode('sitter');
    expect(isOwnerUserMode()).toBe(true);
  });
});
