import { showConfirmDialog } from '../../components/ConfirmDialog/confirmDialog.js';
import { showToast } from '../../js/modules/toast.js';
import { getSitterSecretsManual, subscribeToSitterSecrets } from '../../services/sitterSecretsService.js';
import {
  cancelSitterStay,
  createSitterStay,
  endSitterStayNow,
  extendSitterStay,
  formatStayDate,
  formatStayStatusLabel,
  getSitterStays,
  subscribeToSitterStays
} from '../../services/sitterStaysService.js';

/**
 * @param {import('../../types/app.js').ShellContext} context
 */
export function createSitterStaysSection(context) {
  const subsection = document.createElement('div');
  subsection.className = 'settings-subsection';

  const title = document.createElement('p');
  title.className = 'settings-subsection-title';
  title.textContent = 'Scheduled stays';

  const hint = document.createElement('p');
  hint.className = 'settings-help subtle';
  hint.textContent =
    'For remote sitters and short lets: share the hub URL and add their email here. Login opens 7 days before the sit by default; home access details appear on sit dates and access is removed 1 day after the sit ends.';

  const list = document.createElement('div');
  list.className = 'sitter-stays-list';

  const form = createSitterStayForm(context, () => renderList(list, context));

  const render = () => {
    renderList(list, context);
  };

  subscribeToSitterStays(render);
  render();

  subsection.append(title, hint, list, form);
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
    empty.className = 'settings-help subtle';
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
    const extendButton = document.createElement('button');
    extendButton.type = 'button';
    extendButton.className = 'settings-action-button settings-action-button--secondary';
    extendButton.textContent = 'Extend';
    extendButton.addEventListener('click', () => {
      void promptExtendStay(stay, context);
    });
    actions.append(extendButton);

    const endButton = document.createElement('button');
    endButton.type = 'button';
    endButton.className = 'settings-action-button settings-action-button--secondary';
    endButton.textContent = stay.status === 'active' ? 'End now' : 'Cancel';
    endButton.addEventListener('click', () => {
      const isActive = stay.status === 'active';
      void showConfirmDialog({
        title: isActive ? 'End this stay now?' : 'Cancel scheduled stay?',
        message: isActive
          ? 'Sitter login and home access details will be removed immediately.'
          : 'This stay will not open sitter access on the scheduled dates.',
        confirmLabel: isActive ? 'End now' : 'Cancel stay',
        cancelLabel: 'Keep'
      }).then((confirmed) => {
        if (!confirmed) return;
        const action = isActive ? endSitterStayNow(stay.id) : cancelSitterStay(stay.id);
        void action.then((result) => {
          if (!result.ok) {
            showToast(context.toast, result.message || 'Could not update stay.');
            return;
          }
          showToast(context.toast, isActive ? 'Stay ended.' : 'Stay cancelled.');
        });
      });
    });
    actions.append(endButton);
  }

  card.append(head, dates, emails, actions);
  return card;
}

/**
 * @param {import('../../api/sitterStaysApi.js').SitterStayPayload} stay
 * @param {import('../../types/app.js').ShellContext} context
 */
async function promptExtendStay(stay, context) {
  const nextEnd = window.prompt('New sit end date (YYYY-MM-DD):', stay.sitEnd);
  if (nextEnd == null || nextEnd.trim() === '') return;

  const result = await extendSitterStay(stay.id, { sitEnd: nextEnd.trim() });
  if (!result.ok) {
    showToast(context.toast, result.message || 'Could not extend stay.');
    return;
  }
  showToast(context.toast, 'Stay extended.');
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 * @param {() => void} onCreated
 */
function createSitterStayForm(context, onCreated) {
  const form = document.createElement('form');
  form.className = 'sitter-stay-form';
  form.noValidate = true;

  const labelField = document.createElement('label');
  labelField.className = 'settings-field';
  labelField.textContent = 'Label (optional)';
  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.className = 'settings-input';
  labelInput.placeholder = 'March house sit';
  labelField.append(labelInput);

  const emailsField = document.createElement('label');
  emailsField.className = 'settings-field';
  emailsField.textContent = 'Sitter email(s)';
  const emailsInput = document.createElement('textarea');
  emailsInput.className = 'settings-input settings-input--textarea';
  emailsInput.rows = 2;
  emailsInput.placeholder = 'sitter@example.com';
  emailsField.append(emailsInput);

  const startField = document.createElement('label');
  startField.className = 'settings-field';
  startField.textContent = 'Sit starts';
  const startInput = document.createElement('input');
  startInput.type = 'date';
  startInput.className = 'settings-input';
  startField.append(startInput);

  const endField = document.createElement('label');
  endField.className = 'settings-field';
  endField.textContent = 'Sit ends';
  const endInput = document.createElement('input');
  endInput.type = 'date';
  endInput.className = 'settings-input';
  endField.append(endInput);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'settings-action-button';
  submit.textContent = 'Schedule stay';

  form.append(labelField, emailsField, startField, endField, submit);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit.disabled = true;
    void createSitterStay({
      label: labelInput.value.trim(),
      emails: emailsInput.value,
      sitStart: startInput.value,
      sitEnd: endInput.value
    }).then((result) => {
      submit.disabled = false;
      if (!result.ok) {
        showToast(context.toast, result.message || 'Could not schedule stay.');
        return;
      }
      labelInput.value = '';
      emailsInput.value = '';
      startInput.value = '';
      endInput.value = '';
      showToast(context.toast, 'Stay scheduled.');
      onCreated();
    });
  });

  return form;
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
