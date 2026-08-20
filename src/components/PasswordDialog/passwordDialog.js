/**
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.confirmLabel]
 * @param {string} [options.cancelLabel]
 * @param {string} [options.passwordLabel]
 * @param {boolean} [options.requireConfirmation]
 * @returns {Promise<string | null>}
 */
export function showPasswordDialog({
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  passwordLabel = 'Password',
  requireConfirmation = false
}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'password-dialog-title');
    overlay.tabIndex = -1;

    const panel = document.createElement('div');
    panel.className = 'confirm-dialog';

    const body = document.createElement('div');
    body.className = 'confirm-dialog-body';

    const heading = document.createElement('h3');
    heading.id = 'password-dialog-title';
    heading.className = 'confirm-dialog-title';
    heading.textContent = title;

    const copy = document.createElement('p');
    copy.className = 'confirm-dialog-message';
    copy.textContent = message;

    const passwordField = document.createElement('label');
    passwordField.className = 'password-dialog-field';
    const passwordCaption = document.createElement('span');
    passwordCaption.className = 'password-dialog-label';
    passwordCaption.textContent = passwordLabel;
    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.className = 'password-dialog-input';
    passwordInput.autocomplete = requireConfirmation ? 'new-password' : 'current-password';
    passwordField.append(passwordCaption, passwordInput);

    /** @type {HTMLInputElement | null} */
    let confirmInput = null;
    if (requireConfirmation) {
      const confirmField = document.createElement('label');
      confirmField.className = 'password-dialog-field';
      const confirmCaption = document.createElement('span');
      confirmCaption.className = 'password-dialog-label';
      confirmCaption.textContent = 'Confirm password';
      confirmInput = document.createElement('input');
      confirmInput.type = 'password';
      confirmInput.className = 'password-dialog-input';
      confirmInput.autocomplete = 'new-password';
      confirmField.append(confirmCaption, confirmInput);
      body.append(heading, copy, passwordField, confirmField);
    } else {
      body.append(heading, copy, passwordField);
    }

    const error = document.createElement('p');
    error.className = 'password-dialog-error';
    error.hidden = true;
    error.setAttribute('role', 'alert');
    body.append(error);

    const actions = document.createElement('div');
    actions.className = 'confirm-dialog-actions';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'button-secondary';
    cancelButton.textContent = cancelLabel;

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'button-primary';
    confirmButton.textContent = confirmLabel;

    actions.append(cancelButton, confirmButton);
    body.append(actions);
    panel.append(body);
    overlay.append(panel);
    document.body.append(overlay);

    let settled = false;

    /**
     * @param {string | null} password
     */
    function finish(password) {
      if (settled) return;
      settled = true;
      overlay.remove();
      resolve(password);
    }

    function validateAndSubmit() {
      error.hidden = true;
      const password = passwordInput.value;
      if (!password.trim()) {
        error.hidden = false;
        error.textContent = 'Enter a password.';
        passwordInput.focus();
        return;
      }
      if (requireConfirmation && confirmInput) {
        if (password !== confirmInput.value) {
          error.hidden = false;
          error.textContent = 'Passwords do not match.';
          confirmInput.focus();
          return;
        }
      }
      finish(password);
    }

    cancelButton.addEventListener('click', () => finish(null));
    confirmButton.addEventListener('click', validateAndSubmit);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(null);
    });
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(null);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        validateAndSubmit();
      }
    });

    passwordInput.focus();
  });
}
