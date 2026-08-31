import '../src/apps/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DeploymentMode,
  getDeploymentMode,
  isHomeDeployment,
  isHouseSitterDeployment
} from '../src/auth/deploymentMode.js';
import { ownerAuthProvider } from '../src/auth/OwnerAuthProvider.js';
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
import { getModeConfig } from '../src/modes/modeConfig.js';
import { getVisibleApps, isAppVisible } from '../src/services/appVisibility.js';
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

  it('authenticates only through the Worker API', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    vi.stubEnv('VITE_OWNER_PIN', '');
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ ok: true, authenticated: true })
    });
    await expect(ownerAuthProvider.authenticate('1234', fetchImpl)).resolves.toMatchObject({
      status: 'success'
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(String(fetchImpl.mock.calls[0][1].body)).not.toContain('VITE_OWNER_PIN');
  });

  it('unlocking owner mode restores owner applications', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    setActiveProfileId('housesitter');
    setUserMode(UserMode.HouseSitter);
    markOwnerUnlockedByPin();
    setActiveProfileId('owner');
    setUserMode(UserMode.Owner);

    const ids = getVisibleApps().map((app) => app.id);
    expect(ids).toContain('settings');
    expect(ids).not.toContain('emergency');
    expect(ids).not.toContain('house-guide');
    expect(ids).not.toContain('scooter');
    expect(getModeConfig().branding.eyebrow).toBe('HOME HUB');
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
    expect(isAppVisible('settings')).toBe(true);
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

  it('uses hub branding', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    const config = getModeConfig();
    expect(config.branding.homeChromeTitle).toBe('Home Hub');
  });

  it('shows sitter app set', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    const ids = getVisibleApps().map((app) => app.id);
    expect(ids).toEqual(['weather', 'scooter', 'house-guide', 'bins', 'emergency']);
  });

  it('does not show controls to house sitters', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    expect(isAppVisible('controls')).toBe(false);
  });
});
