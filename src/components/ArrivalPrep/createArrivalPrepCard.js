import { buildArrivalPrepChecklist, shouldShowArrivalPrepChecklist } from '../../lib/arrivalPrep/buildArrivalPrepChecklist.js';
import {
  normalizeArrivalPrepProfile,
  pruneArrivalPrepChecks,
  withArrivalPrepGardenEnabled,
  withArrivalPrepReset,
  withArrivalPrepTaskChecked
} from '../../lib/arrivalPrep/arrivalPrepProfile.js';
import {
  getSiteProfileState,
  saveSiteProfile,
  subscribeToSiteProfile
} from '../../services/siteProfileService.js';

/**
 * @param {HTMLElement} host
 * @param {Record<string, unknown>} profile
 * @param {'card' | 'app'} [variant]
 */
function renderArrivalPrepChecklist(host, profile, variant = 'card') {
  host.replaceChildren();

  if (!shouldShowArrivalPrepChecklist(profile)) {
    host.replaceChildren();
    if (variant === 'app') {
      const message = document.createElement('p');
      message.className = 'settings-help subtle';
      message.textContent =
        'Arrival checklists appear when your hub is set up for guests or sitters — not owner-only use.';
      host.append(message);
      host.hidden = false;
    } else {
      host.hidden = true;
    }
    return;
  }

  const checklist = buildArrivalPrepChecklist(profile);
  if (!checklist || checklist.totalCount === 0) {
    host.replaceChildren();
    host.hidden = variant !== 'app';
    return;
  }

  host.hidden = false;
  const arrivalPrep = normalizeArrivalPrepProfile(profile.arrivalPrep);

  const card = document.createElement('section');
  card.className =
    variant === 'app' ? 'arrival-prep-card arrival-prep-card--app' : 'arrival-prep-card';
  card.setAttribute('aria-label', checklist.title);

  const header = document.createElement('div');
  header.className = 'arrival-prep-header';

  const title = document.createElement('h2');
  title.className = 'arrival-prep-title';
  title.textContent = checklist.title;

  const summary = document.createElement('p');
  summary.className = 'arrival-prep-summary subtle';
  summary.textContent =
    checklist.remainingCount === 0
      ? 'All tasks complete — you are ready for arrival.'
      : `${checklist.remainingCount} task${checklist.remainingCount === 1 ? '' : 's'} remaining`;

  header.append(title, summary);

  const options = document.createElement('div');
  options.className = 'arrival-prep-options';

  const gardenToggleId = 'arrival-prep-garden-toggle';
  const gardenLabel = document.createElement('label');
  gardenLabel.className = 'arrival-prep-garden-toggle';
  gardenLabel.setAttribute('for', gardenToggleId);

  const gardenInput = document.createElement('input');
  gardenInput.type = 'checkbox';
  gardenInput.id = gardenToggleId;
  gardenInput.checked = arrivalPrep.gardenEnabled;

  const gardenText = document.createElement('span');
  gardenText.textContent = 'We have a garden to maintain';

  gardenLabel.append(gardenInput, gardenText);
  options.append(gardenLabel);

  /** @type {ReturnType<typeof setTimeout> | null} */
  let saveTimer = null;

  /** @param {Record<string, unknown>} patch */
  function queueSave(patch) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void saveSiteProfile(patch);
    }, 280);
  }

  gardenInput.addEventListener('change', () => {
    const nextArrivalPrep = withArrivalPrepGardenEnabled(arrivalPrep, gardenInput.checked);
    const currentProfile = getSiteProfileState()?.profile ?? profile;
    const nextChecklist = buildArrivalPrepChecklist({
      ...currentProfile,
      arrivalPrep: pruneArrivalPrepChecks(nextArrivalPrep, checklist.taskIds)
    });
    const pruned = pruneArrivalPrepChecks(
      nextArrivalPrep,
      nextChecklist?.taskIds ?? checklist.taskIds
    );
    queueSave({ arrivalPrep: pruned });
    renderArrivalPrepChecklist(host, { ...currentProfile, arrivalPrep: pruned }, variant);
  });

  const sectionsWrap = document.createElement('div');
  sectionsWrap.className = 'arrival-prep-sections';

  for (const section of checklist.sections) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'arrival-prep-section';

    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'arrival-prep-section-header';

    const sectionTitle = document.createElement('h3');
    sectionTitle.className = 'arrival-prep-section-title';
    sectionTitle.textContent = `${section.icon} ${section.title}`;

    const sectionProgress = document.createElement('span');
    sectionProgress.className = 'arrival-prep-section-progress subtle';
    sectionProgress.textContent = `${section.completeCount} / ${section.totalCount}`;

    sectionHeader.append(sectionTitle, sectionProgress);

    const taskList = document.createElement('ul');
    taskList.className = 'arrival-prep-task-list';

    for (const task of section.tasks) {
      const item = document.createElement('li');
      item.className = 'arrival-prep-task';

      const taskLabel = document.createElement('label');
      taskLabel.className = 'arrival-prep-task-label';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.checked;
      checkbox.dataset.taskId = task.id;

      const text = document.createElement('span');
      text.textContent = task.label;

      taskLabel.append(checkbox, text);
      item.append(taskLabel);
      taskList.append(item);

      checkbox.addEventListener('change', () => {
        const currentProfile = getSiteProfileState()?.profile ?? profile;
        const currentPrep = normalizeArrivalPrepProfile(currentProfile.arrivalPrep);
        const nextArrivalPrep = withArrivalPrepTaskChecked(currentPrep, task.id, checkbox.checked);
        queueSave({ arrivalPrep: nextArrivalPrep });
        renderArrivalPrepChecklist(host, { ...currentProfile, arrivalPrep: nextArrivalPrep }, variant);
      });
    }

    sectionEl.append(sectionHeader, taskList);
    sectionsWrap.append(sectionEl);
  }

  const actions = document.createElement('div');
  actions.className = 'arrival-prep-actions';

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'settings-action-button settings-action-button--secondary arrival-prep-reset';
  resetButton.textContent = 'Reset all tasks';
  resetButton.addEventListener('click', () => {
    const currentProfile = getSiteProfileState()?.profile ?? profile;
    const nextArrivalPrep = withArrivalPrepReset(normalizeArrivalPrepProfile(currentProfile.arrivalPrep));
    queueSave({ arrivalPrep: nextArrivalPrep });
    renderArrivalPrepChecklist(host, { ...currentProfile, arrivalPrep: nextArrivalPrep }, variant);
  });

  actions.append(resetButton);

  card.append(header, options, sectionsWrap, actions);
  host.append(card);
}

/**
 * @param {HTMLElement} host
 * @param {{ variant?: 'card' | 'app' }} [options]
 */
export function mountArrivalPrepChecklist(host, options = {}) {
  const variant = options.variant ?? 'card';

  function refresh() {
    const profile = getSiteProfileState()?.profile ?? {};
    renderArrivalPrepChecklist(host, profile, variant);
  }

  refresh();
  subscribeToSiteProfile(refresh);
}
