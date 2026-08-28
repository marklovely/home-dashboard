import { createSetupField, createSetupTextarea } from '../../components/HubSetup/hubSetupFields.js';
import {
  SITTER_STAY_FORM_SUMMARY_ERROR,
  prepareSitterStayEndDatePicker,
  syncSitterStayEndDateWithStart,
  validateSitterStayForm
} from '../../lib/sitterStayFormValidation.js';

/** @typedef {{
 *   label: string | null,
 *   emails: string,
 *   sitStart: string,
 *   sitEnd: string
 * }} EditStayFormValues
 */

/**
 * @param {Object} options
 * @param {import('../../api/sitterStaysApi.js').SitterStayPayload} options.stay
 * @param {(isoDate: string) => string} options.formatDate
 * @returns {Promise<EditStayFormValues | null>}
 */
export function showEditStayDialog({ stay, formatDate }) {
  return new Promise((resolve) => {
    const displayLabel = stay.label?.trim() || stay.emails.join(', ');

    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'edit-stay-dialog-title');
    overlay.tabIndex = -1;

    const panel = document.createElement('div');
    panel.className = 'confirm-dialog edit-stay-dialog';

    const body = document.createElement('div');
    body.className = 'confirm-dialog-body';

    const heading = document.createElement('h3');
    heading.id = 'edit-stay-dialog-title';
    heading.className = 'confirm-dialog-title';
    heading.textContent = 'Edit stay';

    const copy = document.createElement('p');
    copy.className = 'confirm-dialog-message';
    copy.textContent = `${displayLabel} (${formatDate(stay.sitStart)} – ${formatDate(stay.sitEnd)}).`;

    const form = document.createElement('div');
    form.className = 'edit-stay-dialog-form';

    const summaryError = document.createElement('p');
    summaryError.className = 'sitter-stay-form-summary-error edit-stay-dialog-summary-error';
    summaryError.hidden = true;
    summaryError.textContent = SITTER_STAY_FORM_SUMMARY_ERROR;

    const labelField = createSetupField('Label (optional)', stay.label ?? '', {
      placeholder: 'March house sit',
      helpText: 'A short name for you — sitters do not see this.'
    });

    const emailsField = createSetupTextarea('Sitter email(s)', stay.emails.join('\n'), {
      rows: 3,
      placeholder: 'sitter@example.com',
      helpText: 'Comma- or newline-separated. Must match the email they use to sign in via Cloudflare Access.'
    });

    const datesRow = document.createElement('div');
    datesRow.className = 'sitter-stay-form__dates';

    const startField = createSetupField('Sit starts', stay.sitStart, { type: 'date' });
    const endField = createSetupField('Sit ends', stay.sitEnd, {
      type: 'date',
      helpText: 'Must be on or after the start date.'
    });
    datesRow.append(startField.wrap, endField.wrap);

    /** @type {Record<string, { input: HTMLInputElement | HTMLTextAreaElement, wrap: HTMLElement, error: HTMLElement }>} */
    const validatedFields = {};

    for (const [key, fieldWrap, input] of [
      ['emails', emailsField.wrap, emailsField.textarea],
      ['sitStart', startField.wrap, startField.input],
      ['sitEnd', endField.wrap, endField.input]
    ]) {
      let error = fieldWrap.querySelector('.hub-setup-field-error');
      if (!error) {
        error = document.createElement('p');
        error.className = 'hub-setup-field-error subtle';
        error.hidden = true;
        fieldWrap.append(error);
      }
      validatedFields[key] = { input, wrap: fieldWrap, error };
    }

    function setFieldValidationState(input, fieldWrap, errorEl, message) {
      if (message) {
        errorEl.textContent = message;
        errorEl.hidden = false;
        input.classList.add('hub-setup-input--invalid');
        input.setAttribute('aria-invalid', 'true');
        fieldWrap.classList.add('hub-setup-field--invalid');
        return;
      }
      errorEl.hidden = true;
      input.classList.remove('hub-setup-input--invalid');
      input.removeAttribute('aria-invalid');
      fieldWrap.classList.remove('hub-setup-field--invalid');
    }

    function showFormValidation(fieldErrors) {
      summaryError.hidden = false;
      for (const [key, field] of Object.entries(validatedFields)) {
        setFieldValidationState(field.input, field.wrap, field.error, fieldErrors[key] ?? null);
      }
      const firstInvalid = Object.values(validatedFields).find((field) =>
        field.input.classList.contains('hub-setup-input--invalid')
      );
      firstInvalid?.input.focus();
    }

    startField.input.addEventListener('change', () => {
      syncSitterStayEndDateWithStart(startField.input, endField.input);
      if (endField.input.classList.contains('hub-setup-input--invalid')) {
        setFieldValidationState(endField.input, endField.wrap, validatedFields.sitEnd.error, null);
      }
    });

    endField.input.addEventListener('focus', () => {
      prepareSitterStayEndDatePicker(startField.input, endField.input);
    });

    for (const field of Object.values(validatedFields)) {
      field.input.addEventListener('input', () => {
        if (field.input.classList.contains('hub-setup-input--invalid')) {
          setFieldValidationState(field.input, field.wrap, field.error, null);
        }
        const stillInvalid = Object.values(validatedFields).some((entry) =>
          entry.input.classList.contains('hub-setup-input--invalid')
        );
        if (!stillInvalid) {
          summaryError.hidden = true;
        }
      });
    }

    syncSitterStayEndDateWithStart(startField.input, endField.input);

    form.append(summaryError, labelField.wrap, emailsField.wrap, datesRow);

    const actions = document.createElement('div');
    actions.className = 'confirm-dialog-actions';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'button-secondary';
    cancelButton.textContent = 'Cancel';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'button-primary';
    saveButton.textContent = 'Save changes';

    actions.append(cancelButton, saveButton);
    body.append(heading, copy, form, actions);
    panel.append(body);
    overlay.append(panel);
    document.body.append(overlay);

    let settled = false;

    /** @param {EditStayFormValues | null} value */
    function finish(value) {
      if (settled) return;
      settled = true;
      overlay.remove();
      resolve(value);
    }

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

    saveButton.addEventListener('click', () => {
      const validation = validateSitterStayForm({
        emails: emailsField.textarea.value,
        sitStart: startField.input.value,
        sitEnd: endField.input.value
      });

      if (!validation.ok) {
        showFormValidation(validation.fieldErrors);
        return;
      }

      finish({
        label: labelField.input.value.trim() || null,
        emails: emailsField.textarea.value,
        sitStart: startField.input.value,
        sitEnd: endField.input.value
      });
    });

    labelField.input.focus();
  });
}
