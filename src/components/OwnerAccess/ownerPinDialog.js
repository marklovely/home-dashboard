import { isOwnerAccessAllowed } from '../../auth/deploymentMode.js';
import { unlockOwner } from '../../auth/deviceSessionStore.js';

const PIN_LENGTH = 4;

/**
 * @param {HTMLElement} container
 * @param {number} filled
 */
function renderPinIndicators(container, filled) {
  container.replaceChildren();
  for (let index = 0; index < PIN_LENGTH; index += 1) {
    const dot = document.createElement('span');
    dot.className = 'owner-pin-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.textContent = index < filled ? '●' : '○';
    container.append(dot);
  }
}

/**
 * @param {Object} options
 * @param {HTMLElement} options.host
 * @param {() => void} [options.onClose]
 * @param {() => void} [options.onSuccess]
 */
export function openOwnerPinDialog({ host, onClose, onSuccess }) {
  if (!isOwnerAccessAllowed()) return;

  host.replaceChildren();

  const overlay = document.createElement('div');
  overlay.className = 'owner-pin-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Owner Access');

  overlay.tabIndex = -1;

  const panel = document.createElement('div');
  panel.className = 'owner-pin-panel';

  const title = document.createElement('h2');
  title.className = 'owner-pin-title';
  title.textContent = 'Owner Access';

  const prompt = document.createElement('p');
  prompt.className = 'owner-pin-prompt';
  prompt.textContent = 'Enter PIN';

  const indicators = document.createElement('div');
  indicators.className = 'owner-pin-indicators';
  indicators.setAttribute('aria-live', 'polite');

  const errorTitle = document.createElement('p');
  errorTitle.className = 'owner-pin-error-title';
  errorTitle.hidden = true;

  const errorDetail = document.createElement('p');
  errorDetail.className = 'owner-pin-error-detail';
  errorDetail.hidden = true;

  /** @type {string[]} */
  let digits = [];
  let pending = false;

  function clearError() {
    errorTitle.hidden = true;
    errorDetail.hidden = true;
    panel.classList.remove('owner-pin-panel--shake');
  }

  function showError(titleText, detailText) {
    errorTitle.textContent = titleText;
    errorDetail.textContent = detailText;
    errorTitle.hidden = false;
    errorDetail.hidden = false;
    panel.classList.remove('owner-pin-panel--shake');
    void panel.offsetWidth;
    panel.classList.add('owner-pin-panel--shake');
  }

  function closeDialog() {
    digits = [];
    host.replaceChildren();
    onClose?.();
  }

  function setKeypadEnabled(enabled) {
    for (const button of keypad.querySelectorAll('button')) {
      button.disabled = !enabled;
    }
  }

  async function submitPin() {
    if (pending || digits.length !== PIN_LENGTH) return;
    pending = true;
    setKeypadEnabled(false);
    clearError();
    const pin = digits.join('');
    digits = [];
    renderPinIndicators(indicators, 0);

    const result = await unlockOwner(pin, fetch, onSuccess);
    pending = false;
    setKeypadEnabled(true);

    if (result === 'success') {
      host.replaceChildren();
      return;
    }

    if (result === 'rate_limited') {
      showError('Too many attempts', 'Please try again later');
      return;
    }
    if (result === 'access_required') {
      showError(
        'Cloudflare Access session missing',
        'Refresh the page and complete email login on this tablet, then try your PIN again.'
      );
      return;
    }
    if (result === 'unavailable') {
      showError('Owner access is temporarily unavailable', '');
      return;
    }
    showError('Incorrect PIN', 'Please try again');
  }

  function pushDigit(digit) {
    if (pending || digits.length >= PIN_LENGTH) return;
    clearError();
    digits.push(digit);
    renderPinIndicators(indicators, digits.length);
    if (digits.length === PIN_LENGTH) {
      void submitPin();
    }
  }

  function backspace() {
    if (pending || digits.length === 0) return;
    clearError();
    digits.pop();
    renderPinIndicators(indicators, digits.length);
  }

  renderPinIndicators(indicators, 0);

  const keypad = document.createElement('div');
  keypad.className = 'owner-pin-keypad';

  const layout = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['backspace', '0', 'cancel']
  ];

  for (const row of layout) {
    const rowEl = document.createElement('div');
    rowEl.className = 'owner-pin-keypad-row';
    for (const key of row) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'owner-pin-key';
      if (key === 'backspace') {
        button.textContent = '⌫';
        button.setAttribute('aria-label', 'Backspace');
        button.addEventListener('click', backspace);
      } else if (key === 'cancel') {
        button.textContent = 'Cancel';
        button.addEventListener('click', closeDialog);
      } else {
        button.textContent = key;
        button.setAttribute('aria-label', `Digit ${key}`);
        button.addEventListener('click', () => pushDigit(key));
      }
      rowEl.append(button);
    }
    keypad.append(rowEl);
  }

  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      backspace();
      return;
    }
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      pushDigit(event.key);
    }
  });

  panel.append(title, prompt, indicators, errorTitle, errorDetail, keypad);
  overlay.append(panel);
  host.append(overlay);
  overlay.focus();
}
