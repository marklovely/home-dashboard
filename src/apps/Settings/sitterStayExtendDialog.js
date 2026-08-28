import { validateExtendStayEndDate } from '../../lib/sitterStayExtendValidation.js';

/**
 * @param {Object} options
 * @param {string} options.stayLabel
 * @param {string} options.sitStart YYYY-MM-DD
 * @param {string} options.sitEnd YYYY-MM-DD
 * @param {(isoDate: string) => string} options.formatDate
 * @returns {Promise<string | null>} New sit end date, or null if cancelled.
 */
export function showExtendStayDialog({ stayLabel, sitStart, sitEnd, formatDate }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'extend-stay-dialog-title');
    overlay.tabIndex = -1;

    const panel = document.createElement('div');
    panel.className = 'confirm-dialog extend-stay-dialog';

    const body = document.createElement('div');
    body.className = 'confirm-dialog-body';

    const heading = document.createElement('h3');
    heading.id = 'extend-stay-dialog-title';
    heading.className = 'confirm-dialog-title';
    heading.textContent = 'Extend stay';

    const copy = document.createElement('p');
    copy.className = 'confirm-dialog-message';
    copy.textContent = `${stayLabel} currently ends ${formatDate(sitEnd)}. Choose a new end date.`;

    const field = document.createElement('label');
    field.className = 'extend-stay-dialog-field';

    const fieldLabel = document.createElement('span');
    fieldLabel.className = 'extend-stay-dialog-field__label';
    fieldLabel.textContent = 'New sit end date';

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'hub-setup-input extend-stay-dialog-date';
    dateInput.value = sitEnd;
    dateInput.min = sitStart;

    const error = document.createElement('p');
    error.className = 'hub-setup-field-error subtle extend-stay-dialog-error';
    error.hidden = true;

    field.append(fieldLabel, dateInput, error);

    const actions = document.createElement('div');
    actions.className = 'confirm-dialog-actions';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'button-secondary';
    cancelButton.textContent = 'Keep current dates';

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'button-primary';
    confirmButton.textContent = 'Extend stay';

    actions.append(cancelButton, confirmButton);
    body.append(heading, copy, field, actions);
    panel.append(body);
    overlay.append(panel);
    document.body.append(overlay);

    let settled = false;

    function finish(value) {
      if (settled) return;
      settled = true;
      overlay.remove();
      resolve(value);
    }

    function showError(message) {
      error.textContent = message;
      error.hidden = false;
      dateInput.classList.add('hub-setup-input--invalid');
      dateInput.setAttribute('aria-invalid', 'true');
      dateInput.focus();
    }

    function clearError() {
      error.hidden = true;
      dateInput.classList.remove('hub-setup-input--invalid');
      dateInput.removeAttribute('aria-invalid');
    }

    dateInput.addEventListener('input', clearError);

    cancelButton.addEventListener('click', () => finish(null));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(null);
    });
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(null);
      }
    });

    confirmButton.addEventListener('click', () => {
      const nextEnd = dateInput.value.trim();
      const validationError = validateExtendStayEndDate(sitStart, sitEnd, nextEnd);
      if (validationError) {
        showError(validationError);
        return;
      }
      finish(nextEnd);
    });

    dateInput.focus();
  });
}
