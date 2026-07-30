const PRESSING_CLASS = 'is-pressing';
const LOADING_CLASS = 'routine-button--loading';
const SUCCESS_CLASS = 'routine-button--success';
const ERROR_CLASS = 'routine-button--error';
const STATUS_SELECTOR = '.routine-button-status';

const SUCCESS_HOLD_MS = 900;
const ERROR_HOLD_MS = 650;

/**
 * @param {number | number[]} pattern
 */
function vibrate(pattern) {
  navigator.vibrate?.(pattern);
}

/**
 * @param {HTMLElement} element
 */
export function ensureRoutineButtonStatus(element) {
  if (element.querySelector(STATUS_SELECTOR)) return;
  const status = document.createElement('span');
  status.className = 'routine-button-status';
  status.setAttribute('aria-hidden', 'true');
  element.append(status);
}

/**
 * @param {HTMLElement} element
 * @param {() => void} removeClass
 * @param {number} delayMs
 */
function scheduleClassRemoval(element, removeClass, delayMs) {
  window.setTimeout(() => {
    element.classList.remove(removeClass);
  }, delayMs);
}

/**
 * @param {HTMLElement} element
 * @param {() => Promise<void> | void} action
 * @param {{
 *   onSuccess?: () => void,
 *   onError?: (error: unknown) => void
 * }} [options]
 */
export async function runRoutineButtonAction(element, action, options = {}) {
  if (!element || element.dataset.routineBusy === 'true') return;

  element.dataset.routineBusy = 'true';
  element.disabled = true;
  ensureRoutineButtonStatus(element);
  element.classList.add(PRESSING_CLASS, LOADING_CLASS);
  vibrate(35);

  let releaseMs = SUCCESS_HOLD_MS;

  try {
    await action();
    element.classList.remove(LOADING_CLASS, PRESSING_CLASS);
    element.classList.add(SUCCESS_CLASS);
    vibrate([18, 36, 18]);
    options.onSuccess?.();
    scheduleClassRemoval(element, SUCCESS_CLASS, SUCCESS_HOLD_MS);
  } catch (error) {
    releaseMs = ERROR_HOLD_MS;
    element.classList.remove(LOADING_CLASS, PRESSING_CLASS);
    element.classList.add(ERROR_CLASS);
    vibrate([28, 48, 28, 48]);
    options.onError?.(error);
    scheduleClassRemoval(element, ERROR_CLASS, ERROR_HOLD_MS);
  } finally {
    window.setTimeout(() => {
      element.classList.remove(PRESSING_CLASS, LOADING_CLASS);
      element.disabled = false;
      delete element.dataset.routineBusy;
    }, releaseMs);
  }
}
