import { refreshSession, getDeviceSessionStatus } from './deviceSessionStore.js';

/** Refresh sitter cookie renewal (~15 days) and recover mode after Access re-auth. */
const KEEPALIVE_MS = 6 * 60 * 60 * 1000;

/** @type {number | null} */
let timerId = null;

async function tick() {
  if (document.visibilityState !== 'visible') return;
  await refreshSession();
}

/**
 * Periodically ping `/api/device-session` so the sitter cookie is renewed and
 * House Sitter Mode is restored after Cloudflare Access re-authentication.
 */
export function startDeviceSessionKeepalive() {
  if (timerId != null) return;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void tick();
    }
  });

  timerId = window.setInterval(() => {
    void tick();
  }, KEEPALIVE_MS);

  if (getDeviceSessionStatus() === 'ready') {
    void tick();
  }
}
