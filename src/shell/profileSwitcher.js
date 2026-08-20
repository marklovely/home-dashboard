import { isHomeDeployment } from '../auth/deploymentMode.js';
import { getDeviceMode } from '../auth/deviceSessionStore.js';
import { canReturnToHouseSitterMode } from '../auth/ownerSession.js';
import { UserMode, isHouseSitterExperience, setUserMode, subscribeToUserMode } from '../auth/userMode.js';
import { setActiveProfileId } from '../services/profileService.js';
import { subscribeToDeviceSession } from '../auth/deviceSessionStore.js';
import { getCurrentRoute, subscribeToRoute } from './router.js';

export function shouldShowProfileSwitcher() {
  if (!isHomeDeployment()) return false;
  if (getCurrentRoute() === 'hub-setup') return false;
  return getDeviceMode() === 'owner' || canReturnToHouseSitterMode();
}

/**
 * @param {HTMLElement} host
 * @param {{ onChange?: () => void }} [options]
 */
export function initProfileSwitcher(host, options = {}) {
  const render = () => {
    host.replaceChildren();
    if (!shouldShowProfileSwitcher()) {
      host.hidden = true;
      return;
    }

    host.hidden = false;
    host.className = 'shell-profile-switcher';
    host.setAttribute('role', 'group');
    host.setAttribute('aria-label', 'Viewing mode');

    const label = document.createElement('span');
    label.className = 'shell-profile-switcher-label subtle';
    label.textContent = 'Viewing as';

    const controls = document.createElement('div');
    controls.className = 'shell-profile-switcher-controls';

    const guestActive = isHouseSitterExperience();
    controls.append(
      createModeButton('Owner', !guestActive, () => selectView(UserMode.Owner, options.onChange)),
      createModeButton('Guest', guestActive, () => selectView(UserMode.HouseSitter, options.onChange))
    );

    host.append(label, controls);
  };

  render();
  subscribeToUserMode(render);
  subscribeToDeviceSession(render);
  subscribeToRoute(render);
}

/**
 * @param {import('../auth/userMode.js').UserModeId} mode
 * @param {(() => void) | undefined} onChange
 */
function selectView(mode, onChange) {
  if (mode === UserMode.Owner) {
    setUserMode(UserMode.Owner);
    setActiveProfileId('owner');
  } else {
    setUserMode(UserMode.HouseSitter);
    setActiveProfileId('housesitter');
  }
  onChange?.();
}

/**
 * @param {string} label
 * @param {boolean} active
 * @param {() => void} onSelect
 */
function createModeButton(label, active, onSelect) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'shell-profile-switcher-button';
  button.textContent = label;
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
  if (active) button.classList.add('is-active');
  button.addEventListener('click', onSelect);
  return button;
}
