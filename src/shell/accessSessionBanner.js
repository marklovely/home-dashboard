import { subscribeToDeviceSession, getDeviceSessionStatus } from '../auth/deviceSessionStore.js';
import { wasHouseSitterBeforeAccessChallenge } from '../auth/deviceSessionStore.js';
import { isHouseSitterExperience } from '../auth/userMode.js';

const BANNER_ID = 'access-session-banner';

/**
 * Non-blocking hint when Cloudflare Access needs re-auth but sitter mode should resume.
 */
export function initAccessSessionBanner() {
  let banner = document.getElementById(BANNER_ID);
  if (!banner) {
    banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'access-session-banner';
    banner.setAttribute('role', 'status');
    banner.hidden = true;
    document.body.prepend(banner);
  }

  function sync() {
    const show =
      getDeviceSessionStatus() === 'error' &&
      !isHouseSitterExperience() &&
      wasHouseSitterBeforeAccessChallenge();

    if (!show) {
      banner.hidden = true;
      return;
    }

    banner.hidden = false;
    banner.textContent =
      'Sign in when your browser prompts you. House Sitter Mode should continue automatically afterward — you do not need to enable it again.';
  }

  subscribeToDeviceSession(sync);
  sync();
}
