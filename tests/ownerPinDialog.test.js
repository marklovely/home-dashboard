import { afterEach, describe, expect, it, vi } from 'vitest';
import { openOwnerPinDialog } from '../src/components/OwnerAccess/ownerPinDialog.js';
import { ownerAuthProvider } from '../src/auth/OwnerAuthProvider.js';
import { resetUserModeForTests } from '../src/auth/userMode.js';

describe('owner PIN dialog', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetUserModeForTests();
    vi.restoreAllMocks();
  });

  it('starts with four empty indicators', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    const host = document.createElement('div');
    openOwnerPinDialog({ host });
    const dots = host.querySelectorAll('.owner-pin-dot');
    expect(dots).toHaveLength(4);
    expect([...dots].every((dot) => dot.textContent === '○')).toBe(true);
  });

  it('submits automatically on the fourth digit', async () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    vi.spyOn(ownerAuthProvider, 'authenticate').mockResolvedValue('invalid');

    const host = document.createElement('div');
    openOwnerPinDialog({ host });

    for (const digit of ['1', '2', '3', '4']) {
      const button = host.querySelector(`button[aria-label="Digit ${digit}"]`);
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    await vi.waitFor(() => {
      expect(ownerAuthProvider.authenticate).toHaveBeenCalledWith('1234');
    });
    const dots = host.querySelectorAll('.owner-pin-dot');
    expect([...dots].every((dot) => dot.textContent === '○')).toBe(true);
  });

  it('does not open on house sitter deployment', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    const host = document.createElement('div');
    openOwnerPinDialog({ host });
    expect(host.childElementCount).toBe(0);
  });
});
