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
    const dialog = document.createElement('dialog');
    dialog.className = 'confirm-dialog';

    const body = document.createElement('div');
    body.className = 'confirm-dialog-body';

    const heading = document.createElement('h3');
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
    dialog.append(body);
    document.body.append(dialog);

    let settled = false;

    function finish(confirmed) {
      if (settled) return;
      settled = true;
      if (typeof dialog.close === 'function') {
        dialog.close();
      }
      dialog.remove();
      resolve(confirmed);
    }

    cancelButton.addEventListener('click', () => finish(false));
    confirmButton.addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(false);
    });

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      confirmButton.focus();
      return;
    }

    dialog.setAttribute('open', '');
    confirmButton.focus();
  });
}
