import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bootstrapDeviceSession,
  enterSitterMode,
  getDeviceMode,
  getDeviceSessionStatus,
  resetDeviceSessionStoreForTests
} from '../src/auth/deviceSessionStore.js';
import { resetUserModeForTests, isHouseSitterExperience, applyDeviceSessionMode } from '../src/auth/userMode.js';
import { getActiveProfileId, setActiveProfileId } from '../src/services/profileService.js';

describe('device session store', () => {
  afterEach(() => {
    resetDeviceSessionStoreForTests();
    resetUserModeForTests();
    setActiveProfileId('owner');
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
    expect(getActiveProfileId()).toBe('housesitter');
  });

  it('auth failure does not force sitter mode', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await bootstrapDeviceSession(fetchImpl);
    expect(getDeviceSessionStatus()).toBe('error');
    expect(getDeviceMode()).toBe('owner');
  });

  it('enterSitterMode requires persisted sitter cookie on follow-up GET', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ authenticated: true, mode: 'sitter', ownerSessionExpiresAt: null })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ authenticated: true, mode: 'owner', ownerSessionExpiresAt: null })
      });

    const ok = await enterSitterMode(undefined, fetchImpl);
    expect(ok).toBe(false);
    expect(getDeviceSessionStatus()).toBe('error');
    expect(isHouseSitterExperience()).toBe(false);
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
