export const OWNER_INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

/** @type {number | null} */
let timeoutId = null;

/** @type {(() => void) | null} */
let onTimeout = null;

/** @type {boolean} */
let watching = false;

/** @type {(event: Event) => void} */
let activityHandler = null;

function clearTimer() {
  if (timeoutId !== null) {
    window.clearTimeout(timeoutId);
    timeoutId = null;
  }
}

function scheduleTimeout(delayMs) {
  clearTimer();
  timeoutId = window.setTimeout(() => {
    timeoutId = null;
    onTimeout?.();
  }, delayMs);
}

/**
 * @param {() => void} callback
 * @param {number} [timeoutMs]
 */
export function startOwnerInactivityWatch(callback, timeoutMs = OWNER_INACTIVITY_TIMEOUT_MS) {
  stopOwnerInactivityWatch();
  onTimeout = callback;
  watching = true;
  activityHandler = () => {
    if (!watching) return;
    scheduleTimeout(timeoutMs);
  };

  const options = { capture: true, passive: true };
  window.addEventListener('pointerdown', activityHandler, options);
  window.addEventListener('keydown', activityHandler, options);
  window.addEventListener('click', activityHandler, options);

  scheduleTimeout(timeoutMs);
}

export function stopOwnerInactivityWatch() {
  watching = false;
  clearTimer();
  onTimeout = null;
  if (activityHandler) {
    const options = { capture: true };
    window.removeEventListener('pointerdown', activityHandler, options);
    window.removeEventListener('keydown', activityHandler, options);
    window.removeEventListener('click', activityHandler, options);
    activityHandler = null;
  }
}

/** @internal */
export function resetOwnerInactivityForTests() {
  stopOwnerInactivityWatch();
}
