/**
 * @param {HTMLButtonElement} button
 * @param {string} busyLabel
 * @param {() => Promise<unknown>} task
 * @param {() => string} [resolveLabel] Re-applied after the task (e.g. when step navigation changes the label).
 */
export async function withAsyncButtonFeedback(button, busyLabel, task, resolveLabel) {
  const originalLabel = button.textContent ?? '';
  button.disabled = true;
  button.textContent = busyLabel;
  button.setAttribute('aria-busy', 'true');
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.textContent = resolveLabel ? resolveLabel() : originalLabel;
    button.removeAttribute('aria-busy');
  }
}
