/**
 * @param {HTMLButtonElement} button
 * @param {string} busyLabel
 * @param {() => Promise<unknown>} task
 */
export async function withAsyncButtonFeedback(button, busyLabel, task) {
  const originalLabel = button.textContent ?? '';
  button.disabled = true;
  button.textContent = busyLabel;
  button.setAttribute('aria-busy', 'true');
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
    button.removeAttribute('aria-busy');
  }
}
