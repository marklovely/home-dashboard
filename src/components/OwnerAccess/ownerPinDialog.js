import { OwnerAuthProvider } from '../../auth/OwnerAuthProvider.js';
import { markOwnerUnlockedByPin } from '../../auth/ownerSession.js';
import { setUserMode, UserMode } from '../../auth/userMode.js';
import { isHomeDeployment } from '../../auth/deploymentMode.js';

/**
 * @param {Object} options
 * @param {HTMLElement} options.host
 * @param {() => void} [options.onClose]
 * @param {() => void} [options.onSuccess]
 */
export function openOwnerPinDialog({ host, onClose, onSuccess }) {
  host.replaceChildren();

  const overlay = document.createElement('div');
  overlay.className = 'owner-pin-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Owner Access');

  const panel = document.createElement('div');
  panel.className = 'owner-pin-panel';

  const title = document.createElement('h2');
  title.className = 'owner-pin-title';
  title.textContent = 'Owner Access';

  const prompt = document.createElement('p');
  prompt.className = 'owner-pin-prompt';
  prompt.textContent = 'Enter PIN';

  const display = document.createElement('div');
  display.className = 'owner-pin-display';
  display.setAttribute('aria-live', 'polite');
  display.textContent = '••••';

  const error = document.createElement('p');
  error.className = 'owner-pin-error';
  error.hidden = true;

  if (isHomeDeployment() && !OwnerAuthProvider.isPinConfigured()) {
    error.textContent =
      'Owner PIN is not configured for this build. Add VITE_OWNER_PIN in Cloudflare Pages and redeploy.';
    error.hidden = false;
  }

  /** @type {string[]} */
  let digits = [];

  function renderDigits() {
    display.textContent = digits.length ? '•'.repeat(digits.length) : 'Enter PIN';
  }

  async function submitPin() {
    if (digits.length === 0) return;
    if (!OwnerAuthProvider.isPinConfigured()) return;
    const pin = digits.join('');
    digits = [];
    renderDigits();
    const ok = await OwnerAuthProvider.validatePin(pin);
    if (ok) {
      setUserMode(UserMode.Owner);
      markOwnerUnlockedByPin();
      host.replaceChildren();
      onSuccess?.();
      return;
    }
    error.textContent = 'Incorrect PIN. Guest mode is unchanged.';
    error.hidden = false;
  }

  const keypad = document.createElement('div');
  keypad.className = 'owner-pin-keypad';

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'enter'];
  for (const key of keys) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'owner-pin-key';
    if (key === 'clear') {
      button.textContent = 'Clear';
      button.addEventListener('click', () => {
        digits = [];
        error.hidden = true;
        renderDigits();
      });
    } else if (key === 'enter') {
      button.textContent = 'OK';
      button.classList.add('owner-pin-key--enter');
      button.addEventListener('click', () => void submitPin());
    } else {
      button.textContent = key;
      button.addEventListener('click', () => {
        if (digits.length >= 8) return;
        error.hidden = true;
        digits.push(key);
        renderDigits();
      });
    }
    keypad.append(button);
  }

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'owner-pin-cancel';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => {
    host.replaceChildren();
    onClose?.();
  });

  panel.append(title, prompt, display, error, keypad, cancel);
  overlay.append(panel);
  host.append(overlay);
  cancel.focus();
}
