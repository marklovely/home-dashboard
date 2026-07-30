import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bootstrapDeviceSession,
  getDeviceMode,
  getDeviceSessionStatus,
  resetDeviceSessionStoreForTests
} from '../src/auth/deviceSessionStore.js';
import { resetUserModeForTests, isHouseSitterExperience, applyDeviceSessionMode } from '../src/auth/userMode.js';

describe('device session store', () => {
  afterEach(() => {
    resetDeviceSessionStoreForTests();
    resetUserModeForTests();
    vi.unstubAllEnvs();
  });

  it('startup applies owner mode when server has no sitter cookie', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ authenticated: true, mode: 'owner', ownerSessionExpiresAt: null })
    });
    await bootstrapDeviceSession(fetchImpl);
    expect(getDeviceSessionStatus()).toBe('ready');
    expect(getDeviceMode()).toBe('owner');
    expect(isHouseSitterExperience()).toBe(false);
  });

  it('server sitter cookie renders sitter UI', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ authenticated: true, mode: 'sitter', ownerSessionExpiresAt: null })
    });
    await bootstrapDeviceSession(fetchImpl);
    expect(isHouseSitterExperience()).toBe(true);
  });

  it('auth failure does not force sitter mode', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await bootstrapDeviceSession(fetchImpl);
    expect(getDeviceSessionStatus()).toBe('error');
    expect(getDeviceMode()).toBe('owner');
  });
});

describe('userMode device session sync', () => {
  afterEach(() => {
    resetUserModeForTests();
  });

  it('applyDeviceSessionMode maps server modes', () => {
    applyDeviceSessionMode('owner');
    expect(isHouseSitterExperience()).toBe(false);
    applyDeviceSessionMode('sitter');
    expect(isHouseSitterExperience()).toBe(true);
  });
});
