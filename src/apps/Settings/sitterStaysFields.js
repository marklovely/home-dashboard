import { showConfirmDialog } from '../../components/ConfirmDialog/confirmDialog.js';
import { createSetupField, createSetupTextarea } from '../../components/HubSetup/hubSetupFields.js';
import { withAsyncButtonFeedback } from '../../lib/asyncButtonFeedback.js';
import { showToast } from '../../js/modules/toast.js';
import {
  SITTER_STAY_FORM_SUMMARY_ERROR,
  prepareSitterStayEndDatePicker,
  syncSitterStayEndDateWithStart,
  validateSitterStayForm
} from '../../lib/sitterStayFormValidation.js';
import { getSitterSecretsManual, subscribeToSitterSecrets } from '../../services/sitterSecretsService.js';
import { showExtendStayDialog } from './sitterStayExtendDialog.js';
import { showEditStayDialog } from './sitterStayEditDialog.js';
import {
  cancelSitterStay,
  createSitterStay,
  endSitterStayNow,
  extendSitterStay,
  formatStayDate,
  formatStayStatusLabel,
  getSitterStays,
  subscribeToSitterStays,
  updateSitterStay
} from '../../services/sitterStaysService.js';

const STAY_ACTION_TOAST_MS = 4000;

/**
 * @param {import('../../api/sitterStaysApi.js').SitterStayPayload} stay
 */
function stayDisplayLabel(stay) {
  return stay.label?.trim() || stay.emails.join(', ');
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 */
export function createSitterStaysSection(context) {
  const subsection = document.createElement('div');
  subsection.className = 'settings-subsection sitter-stays-section';

  const title = document.createElement('p');
  title.className = 'settings-subsection-title';
  title.textContent = 'Scheduled stays';

  const hint = document.createElement('p');
  hint.className = 'settings-help subtle';
  hint.textContent =
    'For remote sitters and short lets: share the hub URL and add their email here. Login opens 7 days before the sit by default; home access details appear on sit dates and access is removed 1 day after the sit ends.';

  const list = document.createElement('div');
  list.className = 'sitter-stays-list';

  const formPanel = createSitterStayForm(context, list, () => renderList(list, context));

  const render = () => {
    renderList(list, context);
  };

  subscribeToSitterStays(render);
  render();

  subsection.append(title, hint, list, formPanel);
  return subsection;
}

/**
 * @param {HTMLElement} list
 * @param {import('../../types/app.js').ShellContext} context
 */
function renderList(list, context) {
  list.replaceChildren();
  const stays = getSitterStays() ?? [];
  const visible = stays.filter((stay) => stay.status !== 'completed' && stay.status !== 'cancelled');

  if (visible.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'settings-help subtle sitter-stays-empty';
    empty.textContent = 'No upcoming or active stays scheduled.';
    list.append(empty);
    return;
  }

  for (const stay of visible) {
    list.append(createStayCard(stay, context));
  }
}

/**
 * @param {import('../../api/sitterStaysApi.js').SitterStayPayload} stay
 * @param {import('../../types/app.js').ShellContext} context
 */
function createStayCard(stay, context) {
  const card = document.createElement('article');
  card.className = 'sitter-stay-card';

  const head = document.createElement('div');
  head.className = 'sitter-stay-card__head';

  const heading = document.createElement('h3');
  heading.className = 'sitter-stay-card__title';
  heading.textContent = stay.label || stay.emails.join(', ');

  const status = document.createElement('span');
  status.className = `sitter-stay-card__status sitter-stay-card__status--${stay.status}`;
  status.textContent = formatStayStatusLabel(stay);

  head.append(heading, status);

  const dates = document.createElement('p');
  dates.className = 'settings-help subtle';
  dates.textContent = `${formatStayDate(stay.sitStart)} – ${formatStayDate(stay.sitEnd)}`;

  const emails = document.createElement('p');
  emails.className = 'settings-help subtle';
  emails.textContent = stay.emails.join(', ');

  const actions = document.createElement('div');
  actions.className = 'sitter-stay-card__actions';

  if (stay.status === 'scheduled' || stay.status === 'active') {
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'settings-action-button settings-action-button--secondary';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => {
      void handleEditStay(stay, context, editButton);
    });
    actions.append(editButton);

    const extendButton = document.createElement('button');
    extendButton.type = 'button';
    extendButton.className = 'settings-action-button settings-action-button--secondary';
    extendButton.textContent = 'Extend';
    extendButton.addEventListener('click', () => {
      void handleExtendStay(stay, context, extendButton);
    });
    actions.append(extendButton);

    const endButton = document.createElement('button');
    endButton.type = 'button';
    endButton.className = 'settings-action-button settings-action-button--secondary';
    endButton.textContent = stay.status === 'active' ? 'End now' : 'Cancel';
    endButton.addEventListener('click', () => {
      void handleEndOrCancelStay(stay, context, endButton);
    });
    actions.append(endButton);
  }

  card.append(head, dates, emails, actions);
  return card;
}

/**
 * @param {import('../../api/sitterStaysApi.js').SitterStayPayload} stay
 * @param {import('../../types/app.js').ShellContext} context
 * @param {HTMLButtonElement} button
 */
async function handleEditStay(stay, context, button) {
  const updates = await showEditStayDialog({ stay, formatDate: formatStayDate });
  if (!updates) return;

  await withAsyncButtonFeedback(button, 'Saving…', async () => {
    const result = await updateSitterStay(stay.id, updates);
    if (!result.ok) {
      showToast(context.toast, result.message || 'Could not update stay.', STAY_ACTION_TOAST_MS);
      return;
    }
    const label = result.stay?.label?.trim() || result.stay?.emails?.join(', ') || stayDisplayLabel(stay);
    showToast(context.toast, `${label} updated.`, STAY_ACTION_TOAST_MS);
  });
}

/**
 * @param {import('../../api/sitterStaysApi.js').SitterStayPayload} stay
 * @param {import('../../types/app.js').ShellContext} context
 * @param {HTMLButtonElement} button
 */
async function handleExtendStay(stay, context, button) {
  const label = stayDisplayLabel(stay);
  const nextEnd = await showExtendStayDialog({
    stayLabel: label,
    sitStart: stay.sitStart,
    sitEnd: stay.sitEnd,
    formatDate: formatStayDate
  });
  if (!nextEnd) return;

  await withAsyncButtonFeedback(button, 'Extending…', async () => {
    const result = await extendSitterStay(stay.id, { sitEnd: nextEnd });
    if (!result.ok) {
      showToast(context.toast, result.message || 'Could not extend stay.', STAY_ACTION_TOAST_MS);
      return;
    }
    const newEnd = result.stay?.sitEnd ?? nextEnd;
    showToast(
      context.toast,
      `${label} extended to ${formatStayDate(newEnd)}.`,
      STAY_ACTION_TOAST_MS
    );
  });
}

/**
 * @param {import('../../api/sitterStaysApi.js').SitterStayPayload} stay
 * @param {import('../../types/app.js').ShellContext} context
 * @param {HTMLButtonElement} button
 */
async function handleEndOrCancelStay(stay, context, button) {
  const label = stayDisplayLabel(stay);
  const isActive = stay.status === 'active';
  const confirmed = await showConfirmDialog({
    title: isActive ? 'End this stay now?' : 'Cancel scheduled stay?',
    message: isActive
      ? `${label} (${formatStayDate(stay.sitStart)} – ${formatStayDate(stay.sitEnd)}) — sitter login and home access details will be removed immediately.`
      : `${label} (${formatStayDate(stay.sitStart)} – ${formatStayDate(stay.sitEnd)}) will not open sitter access on the scheduled dates.`,
    confirmLabel: isActive ? 'End now' : 'Cancel stay',
    cancelLabel: 'Keep',
    danger: isActive
  });
  if (!confirmed) return;

  await withAsyncButtonFeedback(button, isActive ? 'Ending…' : 'Cancelling…', async () => {
    const result = await (isActive ? endSitterStayNow(stay.id) : cancelSitterStay(stay.id));
    if (!result.ok) {
      showToast(context.toast, result.message || 'Could not update stay.', STAY_ACTION_TOAST_MS);
      return;
    }
    showToast(
      context.toast,
      isActive
        ? `${label} ended — sitter access removed.`
        : `${label} cancelled — scheduled access will not open.`,
      STAY_ACTION_TOAST_MS
    );
  });
}

/**
 * @param {HTMLElement} fieldWrap
 */
function ensureFieldError(fieldWrap) {
  let error = fieldWrap.querySelector('.hub-setup-field-error');
  if (!error) {
    error = document.createElement('p');
    error.className = 'hub-setup-field-error subtle';
    error.hidden = true;
    fieldWrap.append(error);
  }
  return error;
}

/**
 * @param {HTMLInputElement | HTMLTextAreaElement} input
 * @param {HTMLElement} fieldWrap
 * @param {HTMLElement} errorEl
 * @param {string | null} message
 */
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

/**
 * @param {HTMLFormElement} form
 * @param {boolean} busy
 */
function setSitterStayFormBusy(form, busy) {
  for (const element of form.querySelectorAll('input, textarea, button')) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.disabled = busy;
    }
  }
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 * @param {HTMLElement} staysList
 * @param {() => void} onCreated
 */
function createSitterStayForm(context, staysList, onCreated) {
  const panel = document.createElement('div');
  panel.className = 'sitter-stay-form-panel';

  const formTitle = document.createElement('p');
  formTitle.className = 'settings-subsection-title sitter-stay-form-panel__title';
  formTitle.textContent = 'Schedule a new stay';

  const form = document.createElement('form');
  form.className = 'sitter-stay-form';
  form.noValidate = true;

  const summaryError = document.createElement('p');
  summaryError.className = 'sitter-stay-form-summary-error';
  summaryError.hidden = true;
  summaryError.textContent = SITTER_STAY_FORM_SUMMARY_ERROR;

  const summarySuccess = document.createElement('p');
  summarySuccess.className = 'sitter-stay-form-summary-success';
  summarySuccess.hidden = true;
  summarySuccess.setAttribute('role', 'status');

  const apiError = document.createElement('p');
  apiError.className = 'sitter-stay-form-summary-error sitter-stay-form-api-error';
  apiError.hidden = true;

  const labelField = createSetupField('Label (optional)', '', {
    placeholder: 'March house sit',
    helpText: 'A short name for you — sitters do not see this.'
  });

  const emailsField = createSetupTextarea('Sitter email(s)', '', {
    rows: 3,
    placeholder: 'sitter@example.com',
    helpText: 'Comma- or newline-separated. Must match the email they use to sign in via Cloudflare Access.'
  });

  const datesRow = document.createElement('div');
  datesRow.className = 'sitter-stay-form__dates';

  const startField = createSetupField('Sit starts', '', { type: 'date' });
  const endField = createSetupField('Sit ends', '', {
    type: 'date',
    helpText: 'Defaults to the start date — change if the sit runs longer.'
  });
  datesRow.append(startField.wrap, endField.wrap);

  const emailsError = ensureFieldError(emailsField.wrap);
  const startError = ensureFieldError(startField.wrap);
  const endError = ensureFieldError(endField.wrap);

  startField.input.addEventListener('change', () => {
    syncSitterStayEndDateWithStart(startField.input, endField.input);
    if (endField.input.classList.contains('hub-setup-input--invalid')) {
      setFieldValidationState(endField.input, endField.wrap, endError, null);
    }
  });

  endField.input.addEventListener('focus', () => {
    prepareSitterStayEndDatePicker(startField.input, endField.input);
  });

  /** @type {Record<string, { input: HTMLInputElement | HTMLTextAreaElement, wrap: HTMLElement, error: HTMLElement }>} */
  const validatedFields = {
    emails: { input: emailsField.textarea, wrap: emailsField.wrap, error: emailsError },
    sitStart: { input: startField.input, wrap: startField.wrap, error: startError },
    sitEnd: { input: endField.input, wrap: endField.wrap, error: endError }
  };

  function clearFormFeedback() {
    summaryError.hidden = true;
    summarySuccess.hidden = true;
    apiError.hidden = true;
  }

  function showFormValidation(fieldErrors) {
    clearFormFeedback();
    summaryError.hidden = false;
    summaryError.textContent = SITTER_STAY_FORM_SUMMARY_ERROR;
    for (const [key, field] of Object.entries(validatedFields)) {
      setFieldValidationState(field.input, field.wrap, field.error, fieldErrors[key] ?? null);
    }
    const firstInvalid = Object.values(validatedFields).find((field) =>
      field.input.classList.contains('hub-setup-input--invalid')
    );
    firstInvalid?.input.focus();
    summaryError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

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

  function showApiError(message) {
    clearFormFeedback();
    apiError.textContent = message;
    apiError.hidden = false;
    apiError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * @param {import('../../api/sitterStaysApi.js').SitterStayPayload | null | undefined} stay
   */
  function showSubmitSuccess(stay) {
    for (const field of Object.values(validatedFields)) {
      setFieldValidationState(field.input, field.wrap, field.error, null);
    }
    apiError.hidden = true;
    summaryError.hidden = true;
    const label = stay?.label?.trim() || stay?.emails?.join(', ') || 'Stay';
    const dates =
      stay?.sitStart && stay?.sitEnd
        ? `${formatStayDate(stay.sitStart)} – ${formatStayDate(stay.sitEnd)}`
        : 'dates saved';
    summarySuccess.textContent = `${label} scheduled (${dates}). It appears in the list above.`;
    summarySuccess.hidden = false;
    onCreated();
    staysList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast(context.toast, 'Stay scheduled.', 3500);
    summarySuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'settings-action-button sitter-stay-form__submit';
  submit.textContent = 'Schedule stay';

  form.append(summaryError, apiError, summarySuccess, labelField.wrap, emailsField.wrap, datesRow, submit);
  panel.append(formTitle, form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const validation = validateSitterStayForm({
      emails: emailsField.textarea.value,
      sitStart: startField.input.value,
      sitEnd: endField.input.value
    });

    if (!validation.ok) {
      showFormValidation(validation.fieldErrors);
      showToast(context.toast, SITTER_STAY_FORM_SUMMARY_ERROR, 3500);
      return;
    }

    void withAsyncButtonFeedback(submit, 'Scheduling…', async () => {
      clearFormFeedback();
      setSitterStayFormBusy(form, true);

      try {
        const result = await createSitterStay({
          label: labelField.input.value.trim(),
          emails: emailsField.textarea.value,
          sitStart: startField.input.value,
          sitEnd: endField.input.value
        });

        if (!result.ok) {
          showApiError(result.message || 'Could not schedule stay.');
          showToast(context.toast, result.message || 'Could not schedule stay.', 4000);
          return;
        }

        labelField.input.value = '';
        emailsField.textarea.value = '';
        startField.input.value = '';
        endField.input.value = '';
        showSubmitSuccess(result.stay);
      } finally {
        setSitterStayFormBusy(form, false);
      }
    });
  });

  return panel;
}

/** @param {import('../../types/app.js').ShellContext} _context */
export function createSitterScheduleBanner(_context) {
  const banner = document.createElement('p');
  banner.className = 'settings-help subtle sitter-schedule-banner';
  banner.hidden = true;

  const render = () => {
    const manual = getSitterSecretsManual() === true;
    const stays = (getSitterStays() ?? []).filter((stay) => stay.status === 'active');
    const scheduleActive = stays.some((stay) => {
      const nowSec = Math.floor(Date.now() / 1000);
      return nowSec >= stay.secretsOpensAt && nowSec < stay.secretsClosesAt;
    });

    if (scheduleActive && !manual) {
      const stay = stays[0];
      banner.textContent = `A scheduled stay is sharing home access details until ${formatStayDate(stay.sitEnd)} (plus one day after). Cancel or end the stay to revoke access early.`;
      banner.hidden = false;
      return;
    }
    banner.hidden = true;
  };

  subscribeToSitterSecrets(render);
  subscribeToSitterStays(render);
  render();
  return banner;
}
