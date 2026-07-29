import '../src/apps/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DeploymentMode,
  getDeploymentMode,
  isHomeDeployment,
  isHouseSitterDeployment
} from '../src/auth/deploymentMode.js';
import { OwnerAuthProvider } from '../src/auth/OwnerAuthProvider.js';
import {
  canReturnToHouseSitterMode,
  isOwnerPinSessionActive,
  markOwnerUnlockedByPin,
  resetOwnerSessionForTests
} from '../src/auth/ownerSession.js';
import {
  UserMode,
  getUserMode,
  isHouseSitterExperience,
  resetUserModeForTests,
  setUserMode
} from '../src/auth/userMode.js';
import { getModeConfig, getAppDisplayTitle } from '../src/modes/modeConfig.js';
import { getVisibleApps, isAppVisible } from '../src/services/appVisibility.js';
import { getAppById } from '../src/services/appRegistry.js';
import { setActiveProfileId } from '../src/services/profileService.js';

function resetAuthState() {
  vi.unstubAllEnvs();
  resetUserModeForTests();
  resetOwnerSessionForTests();
  setActiveProfileId('owner');
}

describe('deployment mode', () => {
  afterEach(resetAuthState);

  it('defaults to home deployment', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', '');
    expect(getDeploymentMode()).toBe(DeploymentMode.Home);
    expect(isHomeDeployment()).toBe(true);
  });

  it('supports dedicated house sitter deployment', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    expect(getDeploymentMode()).toBe(DeploymentMode.HouseSitter);
    expect(isHouseSitterDeployment()).toBe(true);
  });
});

describe('user mode defaults', () => {
  afterEach(resetAuthState);

  it('home deployment defaults to owner user mode', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    expect(getUserMode()).toBe(UserMode.Owner);
    expect(isHouseSitterExperience()).toBe(false);
  });

  it('house sitter deployment defaults to house sitter user mode', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    expect(getUserMode()).toBe(UserMode.HouseSitter);
    expect(isHouseSitterExperience()).toBe(true);
  });
});

describe('owner authentication', () => {
  afterEach(resetAuthState);

  it('validates PIN locally via OwnerAuthProvider', async () => {
    vi.stubEnv('VITE_OWNER_PIN', '1234');
    vi.stubEnv('VITE_API_BASE_URL', '');
    await expect(OwnerAuthProvider.validatePin('1234')).resolves.toBe(true);
    await expect(OwnerAuthProvider.validatePin('0000')).resolves.toBe(false);
  });

  it('unlocking owner mode restores owner applications', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    setUserMode(UserMode.HouseSitter);
    markOwnerUnlockedByPin();
    setUserMode(UserMode.Owner);

    const ids = getVisibleApps().map((app) => app.id);
    expect(ids).toContain('settings');
    expect(getModeConfig().branding.eyebrow).toBe('LOVELY HOME HUB');
  });

  it('returning to house sitter restores guest applications', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    setUserMode(UserMode.HouseSitter);
    markOwnerUnlockedByPin();
    setUserMode(UserMode.Owner);
    setUserMode(UserMode.HouseSitter);

    expect(isOwnerPinSessionActive()).toBe(false);
    expect(canReturnToHouseSitterMode()).toBe(false);
    const ids = getVisibleApps().map((app) => app.id);
    expect(ids).toContain('emergency');
    expect(isAppVisible('settings')).toBe(false);
  });

  it('cannot enter owner mode on house sitter deployment', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    expect(setUserMode(UserMode.Owner)).toBe(false);
    expect(getUserMode()).toBe(UserMode.HouseSitter);
  });

  it('keeps PIN session in memory only', () => {
    markOwnerUnlockedByPin();
    expect(isOwnerPinSessionActive()).toBe(true);
    resetOwnerSessionForTests();
    expect(isOwnerPinSessionActive()).toBe(false);
  });

  it('refresh resets to deployment default user mode', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    setUserMode(UserMode.HouseSitter);
    markOwnerUnlockedByPin();
    resetUserModeForTests();
    expect(getUserMode()).toBe(UserMode.Owner);
    expect(isOwnerPinSessionActive()).toBe(false);
  });
});

describe('house sitter experience (deployment locked)', () => {
  afterEach(resetAuthState);

  it('uses Lovely Home branding', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    const config = getModeConfig();
    expect(config.branding.homeChromeTitle).toBe('Lovely Home');
  });

  it('shows sitter app set', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    const ids = getVisibleApps().map((app) => app.id);
    expect(ids).toEqual(['weather', 'scooter', 'house-guide', 'controls', 'bins', 'emergency']);
  });

  it('renames controls for guest display', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    const controls = getAppById('controls');
    expect(getAppDisplayTitle(controls)).toBe('Home Controls');
  });
});
