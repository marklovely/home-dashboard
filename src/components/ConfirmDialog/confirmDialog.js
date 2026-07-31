/**
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.confirmLabel]
 * @param {string} [options.cancelLabel]
 * @param {boolean} [options.danger]
 * @returns {Promise<boolean>}
 */
export function showConfirmDialog({
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  danger = false
}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'confirm-dialog-title');
    overlay.tabIndex = -1;

    const panel = document.createElement('div');
    panel.className = 'confirm-dialog';

    const body = document.createElement('div');
    body.className = 'confirm-dialog-body';

    const heading = document.createElement('h3');
    heading.id = 'confirm-dialog-title';
    heading.className = 'confirm-dialog-title';
    heading.textContent = title;

    const copy = document.createElement('p');
    copy.className = 'confirm-dialog-message';
    copy.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'confirm-dialog-actions';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'button-secondary';
    cancelButton.textContent = cancelLabel;

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = danger ? 'button-primary button-danger' : 'button-primary';
    confirmButton.textContent = confirmLabel;

    actions.append(cancelButton, confirmButton);
    body.append(heading, copy, actions);
    panel.append(body);
    overlay.append(panel);
    document.body.append(overlay);

    let settled = false;

    function finish(confirmed) {
      if (settled) return;
      settled = true;
      overlay.remove();
      resolve(confirmed);
    }

    cancelButton.addEventListener('click', () => finish(false));
    confirmButton.addEventListener('click', () => finish(true));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(false);
    });
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });

    confirmButton.focus();
  });
}
