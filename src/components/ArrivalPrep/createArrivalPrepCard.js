import { buildArrivalPrepChecklist, shouldShowArrivalPrepChecklist } from '../../lib/arrivalPrep/buildArrivalPrepChecklist.js';
import {
  normalizeArrivalPrepProfile,
  pruneArrivalPrepChecks,
  withArrivalPrepArchivedForStay,
  withArrivalPrepCustomTaskAdded,
  withArrivalPrepCustomTaskRemoved,
  withArrivalPrepGardenEnabled,
  withArrivalPrepReset,
  withArrivalPrepSectionCollapsed,
  withArrivalPrepSectionReset,
  withArrivalPrepTaskChecked
} from '../../lib/arrivalPrep/arrivalPrepProfile.js';
import { buildCustomArrivalPrepTaskId } from '../../lib/arrivalPrep/arrivalPrepTaskIds.js';
import {
  formatArrivalPrepStayLabel,
  getNextArrivalPrepStay
} from '../../lib/arrivalPrep/arrivalPrepStays.js';
import {
  getSiteProfileState,
  saveSiteProfile,
  subscribeToSiteProfile
} from '../../services/siteProfileService.js';
import { formatStayDate, getSitterStays, subscribeToSitterStays } from '../../services/sitterStaysService.js';

/**
 * @param {HTMLElement} host
 * @param {Record<string, unknown>} profile
 * @param {'card' | 'app'} [variant]
 */
function renderArrivalPrepChecklist(host, profile, variant = 'card') {
  host.replaceChildren();

  if (!shouldShowArrivalPrepChecklist(profile)) {
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
    host.hidden = variant !== 'app';
    return;
  }

  host.hidden = false;
  const arrivalPrep = normalizeArrivalPrepProfile(profile.arrivalPrep);
  const nextStay = getNextArrivalPrepStay(getSitterStays());
  const collapsedSections = new Set(arrivalPrep.collapsedSectionIds);
  const showStayBanner =
    variant === 'app' &&
    (nextStay ||
      arrivalPrep.checkedTaskIds.length > 0 ||
      arrivalPrep.activeStayId ||
      Object.keys(arrivalPrep.archivedByStayId).length > 0);
  const needsStayArchive =
    nextStay &&
    arrivalPrep.activeStayId !== nextStay.id &&
    (arrivalPrep.checkedTaskIds.length > 0 || Boolean(arrivalPrep.activeStayId));

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

  /** @type {ReturnType<typeof setTimeout> | null} */
  let saveTimer = null;

  /** @param {Record<string, unknown>} patch */
  function queueSave(patch) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void saveSiteProfile(patch);
    }, 280);
  }

  /** @param {import('../../lib/arrivalPrep/arrivalPrepProfile.js').ArrivalPrepProfile} nextArrivalPrep */
  function persistAndRefresh(nextArrivalPrep) {
    const currentProfile = getSiteProfileState()?.profile ?? profile;
    const nextChecklist = buildArrivalPrepChecklist({ ...currentProfile, arrivalPrep: nextArrivalPrep });
    const pruned = pruneArrivalPrepChecks(nextArrivalPrep, nextChecklist?.taskIds ?? []);
    queueSave({ arrivalPrep: pruned });
    renderArrivalPrepChecklist(host, { ...currentProfile, arrivalPrep: pruned }, variant);
  }

  if (showStayBanner) {
    const stayBanner = document.createElement('div');
    stayBanner.className = 'arrival-prep-stay-banner';

    const stayText = document.createElement('p');
    stayText.className = 'arrival-prep-stay-banner-text';
    if (nextStay) {
      stayText.textContent = needsStayArchive
        ? `New stay scheduled: ${formatArrivalPrepStayLabel(nextStay, formatStayDate)}. Archive your current checklist and start fresh for this visit?`
        : `Preparing for ${formatArrivalPrepStayLabel(nextStay, formatStayDate)}.`;
    } else if (arrivalPrep.checkedTaskIds.length > 0) {
      stayText.textContent =
        'No upcoming scheduled stay. You can archive this checklist when you are ready to prepare for the next visit.';
    } else {
      stayText.textContent = 'Start your checklist when you are ready for the next guest or sitter.';
    }

    stayBanner.append(stayText);

    if (needsStayArchive || (arrivalPrep.checkedTaskIds.length > 0 && !nextStay)) {
      const archiveButton = document.createElement('button');
      archiveButton.type = 'button';
      archiveButton.className = 'settings-action-button settings-action-button--secondary arrival-prep-archive';
      archiveButton.textContent = nextStay ? 'Archive & start fresh for this stay' : 'Archive & start fresh';
      archiveButton.addEventListener('click', () => {
        const currentProfile = getSiteProfileState()?.profile ?? profile;
        const currentPrep = normalizeArrivalPrepProfile(currentProfile.arrivalPrep);
        const nextArrivalPrep = withArrivalPrepArchivedForStay(
          currentPrep,
          currentPrep.activeStayId,
          nextStay?.id ?? null
        );
        persistAndRefresh(nextArrivalPrep);
      });
      stayBanner.append(archiveButton);
    }

    card.append(stayBanner);
  }

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

  gardenInput.addEventListener('change', () => {
    const currentProfile = getSiteProfileState()?.profile ?? profile;
    const currentPrep = normalizeArrivalPrepProfile(currentProfile.arrivalPrep);
    const nextArrivalPrep = withArrivalPrepGardenEnabled(currentPrep, gardenInput.checked);
    const nextChecklist = buildArrivalPrepChecklist({
      ...currentProfile,
      arrivalPrep: nextArrivalPrep
    });
    const pruned = pruneArrivalPrepChecks(nextArrivalPrep, nextChecklist?.taskIds ?? checklist.taskIds);
    queueSave({ arrivalPrep: pruned });
    renderArrivalPrepChecklist(host, { ...currentProfile, arrivalPrep: pruned }, variant);
  });

  const sectionsWrap = document.createElement('div');
  sectionsWrap.className = 'arrival-prep-sections';

  for (const section of checklist.sections) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'arrival-prep-section';
    const isCollapsed = collapsedSections.has(section.id);

    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'arrival-prep-section-header';

    const sectionToggle = document.createElement('button');
    sectionToggle.type = 'button';
    sectionToggle.className = 'arrival-prep-section-toggle';
    sectionToggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');

    const sectionTitle = document.createElement('span');
    sectionTitle.className = 'arrival-prep-section-title';
    sectionTitle.textContent = `${section.icon} ${section.title}`;

    const sectionProgress = document.createElement('span');
    sectionProgress.className = 'arrival-prep-section-progress subtle';
    sectionProgress.textContent = `${section.completeCount} / ${section.totalCount}`;

    sectionToggle.append(sectionTitle, sectionProgress);
    sectionToggle.addEventListener('click', () => {
      const currentProfile = getSiteProfileState()?.profile ?? profile;
      const currentPrep = normalizeArrivalPrepProfile(currentProfile.arrivalPrep);
      const nextCollapsed = !collapsedSections.has(section.id);
      const nextArrivalPrep = withArrivalPrepSectionCollapsed(currentPrep, section.id, nextCollapsed);
      queueSave({ arrivalPrep: nextArrivalPrep });
      renderArrivalPrepChecklist(host, { ...currentProfile, arrivalPrep: nextArrivalPrep }, variant);
    });

    const sectionActions = document.createElement('div');
    sectionActions.className = 'arrival-prep-section-actions';

    const resetSectionButton = document.createElement('button');
    resetSectionButton.type = 'button';
    resetSectionButton.className = 'arrival-prep-section-reset subtle';
    resetSectionButton.textContent = 'Reset section';
    resetSectionButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const currentProfile = getSiteProfileState()?.profile ?? profile;
      const currentPrep = normalizeArrivalPrepProfile(currentProfile.arrivalPrep);
      const sectionTaskIds = section.tasks.map((task) => task.id);
      const nextArrivalPrep = withArrivalPrepSectionReset(currentPrep, section.id, sectionTaskIds);
      persistAndRefresh(nextArrivalPrep);
    });

    sectionActions.append(resetSectionButton);
    sectionHeader.append(sectionToggle, sectionActions);

    const sectionBody = document.createElement('div');
    sectionBody.className = 'arrival-prep-section-body';
    sectionBody.hidden = isCollapsed;

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

      if (task.custom) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'arrival-prep-task-remove subtle';
        removeButton.setAttribute('aria-label', `Remove ${task.label}`);
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => {
          const currentProfile = getSiteProfileState()?.profile ?? profile;
          const currentPrep = normalizeArrivalPrepProfile(currentProfile.arrivalPrep);
          const nextArrivalPrep = withArrivalPrepCustomTaskRemoved(currentPrep, task.id);
          persistAndRefresh(nextArrivalPrep);
        });
        item.append(removeButton);
      }

      taskList.append(item);

      checkbox.addEventListener('change', () => {
        const currentProfile = getSiteProfileState()?.profile ?? profile;
        const currentPrep = normalizeArrivalPrepProfile(currentProfile.arrivalPrep);
        const nextArrivalPrep = withArrivalPrepTaskChecked(currentPrep, task.id, checkbox.checked);
        persistAndRefresh(nextArrivalPrep);
      });
    }

    const addTaskRow = document.createElement('form');
    addTaskRow.className = 'arrival-prep-add-task';
    addTaskRow.addEventListener('submit', (event) => {
      event.preventDefault();
      const label = addTaskInput.value.trim();
      if (!label) return;
      const petId = section.id.startsWith('pet-') ? section.id.slice(4) : null;
      const currentProfile = getSiteProfileState()?.profile ?? profile;
      const currentPrep = normalizeArrivalPrepProfile(currentProfile.arrivalPrep);
      const nextArrivalPrep = withArrivalPrepCustomTaskAdded(currentPrep, {
        id: buildCustomArrivalPrepTaskId(petId),
        label,
        sectionId: section.id
      });
      addTaskInput.value = '';
      persistAndRefresh(nextArrivalPrep);
    });

    const addTaskInput = document.createElement('input');
    addTaskInput.type = 'text';
    addTaskInput.className = 'arrival-prep-add-task-input';
    addTaskInput.placeholder = 'Add your own task…';
    addTaskInput.maxLength = 120;

    const addTaskButton = document.createElement('button');
    addTaskButton.type = 'submit';
    addTaskButton.className = 'settings-action-button settings-action-button--secondary arrival-prep-add-task-button';
    addTaskButton.textContent = 'Add';

    addTaskRow.append(addTaskInput, addTaskButton);
    sectionBody.append(taskList, addTaskRow);
    sectionEl.append(sectionHeader, sectionBody);
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
    persistAndRefresh(nextArrivalPrep);
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
  if (variant === 'app') {
    subscribeToSitterStays(refresh);
  }
}
