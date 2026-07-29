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

  it('startup waits for device-session and applies sitter mode', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ authenticated: true, mode: 'sitter', ownerSessionExpiresAt: null })
    });
    await bootstrapDeviceSession(fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/api/device-session'),
      expect.objectContaining({ credentials: 'include' })
    );
    expect(getDeviceSessionStatus()).toBe('ready');
    expect(getDeviceMode()).toBe('sitter');
    expect(isHouseSitterExperience()).toBe(true);
  });

  it('server owner mode renders owner user mode', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        authenticated: true,
        mode: 'owner',
        ownerSessionExpiresAt: new Date(Date.now() + 600_000).toISOString()
      })
    });
    await bootstrapDeviceSession(fetchImpl);
    expect(isHouseSitterExperience()).toBe(false);
  });

  it('invalid session response falls back to sitter', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await bootstrapDeviceSession(fetchImpl);
    expect(getDeviceMode()).toBe('sitter');
    expect(isHouseSitterExperience()).toBe(true);
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
