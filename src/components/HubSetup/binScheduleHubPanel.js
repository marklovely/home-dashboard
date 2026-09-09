/**
 * Hub setup bins step — chooser → sub-wizard → summary (dates + optional details).
 */

import {
  hasConfiguredBinSchedule,
  inferBinSchedulePeriod,
  normalizeBinSchedule,
  readBinScheduleFromProfile
} from '../../lib/binScheduleProfile.js';
import {
  binScheduleEntriesFromParsed,
  parseBinSchedulePaste
} from '../../lib/binSchedulePaste.js';
import { getBinScheduleGuestCopy, getBinScheduleFieldHelp } from './hubSetupHelpContent.js';
import { createSetupField, createSetupIntro } from './hubSetupFields.js';
import { createBinPatternWizard } from './binPatternWizard.js';
import {
  createBinScheduleReviewList,
  reviewEntriesFromSchedule,
  scheduleFromReviewEntries
} from './binScheduleReviewList.js';
import { createBinAlertHoursField } from './binScheduleFields.js';

/** @typedef {'chooser' | 'pattern' | 'paste' | 'summary'} BinHubPanelMode */

/**
 * @param {Record<string, unknown>} profile
 * @param {import('./hubSetupHelpContent.js').HubUseCase} useCase
 * @param {{ onLayoutChange?: () => void, onDatesApplied?: (detail: { count: number, source: 'pattern' | 'paste' }) => void }} [options]
 */
export function createBinScheduleHubPanel(profile = {}, useCase = 'owner', options = {}) {
  let draftSchedule = readBinScheduleFromProfile(profile);
  let mode = /** @type {BinHubPanelMode} */ (
    hasConfiguredBinSchedule(draftSchedule) ? 'summary' : 'chooser'
  );
  const guestCopy = getBinScheduleGuestCopy(useCase);

  const wrap = document.createElement('div');
  wrap.className = 'hub-setup-bin-schedule hub-setup-bin-schedule--hub';

  const location = createSetupField('Where are bins collected from?', draftSchedule.collectionLocation, {
    placeholder: 'End of the close, left-hand side',
    ...getBinScheduleFieldHelp(useCase)
  });

  const councilUrl = createSetupField('Council bins website (optional)', draftSchedule.councilUrl, {
    placeholder: 'https://www.example.gov.uk/bins',
    type: 'url'
  });

  const alertHours = createBinAlertHoursField({ binSchedule: draftSchedule });

  /** @type {ReturnType<typeof createBinPatternWizard> | null} */
  let patternWizard = null;
  /** @type {ReturnType<typeof createBinScheduleReviewList> | null} */
  let entryReviewList = null;

  const pasteWrap = document.createElement('div');
  pasteWrap.className = 'field';
  const pasteLabel = document.createElement('span');
  pasteLabel.textContent = 'Paste collection dates';
  const pasteInput = document.createElement('textarea');
  pasteInput.className = 'hub-setup-bin-paste-input';
  pasteInput.rows = 8;
  pasteInput.placeholder = '2026-09-12 general\n2026-09-19 recycling\n2026-09-26 general';
  const pasteHint = document.createElement('span');
  pasteHint.className = 'settings-help subtle';
  pasteHint.textContent = 'One date per line — e.g. 2026-09-12 general or 19/09/2026 recycling';
  pasteWrap.append(pasteLabel, pasteInput, pasteHint);

  const pastePreview = document.createElement('p');
  pastePreview.className = 'hub-setup-bin-paste-preview subtle';
  pastePreview.hidden = true;

  function mergeDraft(partial) {
    draftSchedule = normalizeBinSchedule({ ...draftSchedule, ...partial });
  }

  function readLocationFields() {
    return {
      collectionLocation: location.input.value.trim(),
      councilUrl: councilUrl.input.value.trim(),
      alertHoursBefore: alertHours.readAlertHoursBefore()
    };
  }

  function dateCount() {
    return draftSchedule.household.length + draftSchedule.gardenWaste.length;
  }

  /**
   * @param {'pattern' | 'paste'} source
   */
  function completeSubWizard(source) {
    mode = 'summary';
    render();
    options.onDatesApplied?.({ count: dateCount(), source });
  }

  function renderChooser() {
    wrap.replaceChildren();
    wrap.append(createSetupIntro(guestCopy.intro));

    const choicesHeading = document.createElement('h3');
    choicesHeading.className = 'settings-subsection-title';
    choicesHeading.textContent = 'How do you want to add dates?';

    const choicesHint = document.createElement('p');
    choicesHint.className = 'settings-help subtle';
    choicesHint.textContent =
      'Pick one option to open a short setup flow. Or tap Continue to skip — you can add dates later in Settings → Bin reminders.';

    const choices = document.createElement('div');
    choices.className = 'hub-setup-bin-choices';

    for (const [title, detail, action, primary] of [
      [
        'Set up from my collection pattern',
        'Answer a few questions — we generate dates for the year.',
        'pattern',
        true
      ],
      [
        'Paste dates from my council calendar',
        'One date per line when the pattern does not fit.',
        'paste',
        false
      ]
    ]) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `hub-setup-bin-choice${primary ? ' hub-setup-bin-choice--primary' : ''}`;
      card.innerHTML = `<strong>${title}</strong><span class="subtle">${detail}</span>`;
      card.addEventListener('click', () => {
        mode = /** @type {BinHubPanelMode} */ (action);
        render();
      });
      choices.append(card);
    }

    wrap.append(choicesHeading, choicesHint, choices);
  }

  function renderSummary() {
    wrap.replaceChildren();

    const count = dateCount();
    const banner = document.createElement('div');
    banner.className = 'hub-setup-bin-summary-banner';
    banner.setAttribute('role', 'status');

    const bannerTitle = document.createElement('p');
    bannerTitle.className = 'hub-setup-bin-summary-banner__title';
    bannerTitle.textContent =
      count > 0
        ? `${count} collection date${count === 1 ? '' : 's'} ready`
        : 'No collection dates yet';

    const bannerDetail = document.createElement('p');
    bannerDetail.className = 'hub-setup-bin-summary-banner__detail subtle';
    bannerDetail.textContent =
      count > 0
        ? 'Check the list below, add where bins are collected from if you like, then tap Continue to save and move on.'
        : 'Add dates with the options below, or tap Continue to skip this step for now.';

    banner.append(bannerTitle, bannerDetail);

    const changeMethod = document.createElement('button');
    changeMethod.type = 'button';
    changeMethod.className = 'hub-setup-bin-change-method';
    changeMethod.textContent = count > 0 ? 'Change how dates were added' : 'Add collection dates';
    changeMethod.addEventListener('click', () => {
      mode = 'chooser';
      render();
    });

    entryReviewList = createBinScheduleReviewList({
      entries: reviewEntriesFromSchedule(draftSchedule),
      onChange: (entries) => {
        mergeDraft(scheduleFromReviewEntries(entries));
        entryReviewList?.setEntries(entries);
        renderSummaryStatus(banner, bannerTitle, bannerDetail);
      },
      emptyMessage: 'No dates yet — tap “Add collection dates” above.'
    });

    const detailsHeading = document.createElement('h3');
    detailsHeading.className = 'settings-subsection-title';
    detailsHeading.textContent = 'Collection day details (optional)';

    renderSummaryStatus(banner, bannerTitle, bannerDetail);
    wrap.append(banner, changeMethod, entryReviewList.wrap, detailsHeading, location.wrap, councilUrl.wrap, alertHours.wrap);
  }

  /**
   * @param {HTMLElement} banner
   * @param {HTMLElement} title
   * @param {HTMLElement} detail
   */
  function renderSummaryStatus(banner, title, detail) {
    const count = dateCount();
    title.textContent =
      count > 0
        ? `${count} collection date${count === 1 ? '' : 's'} ready`
        : 'No collection dates yet';
    detail.textContent =
      count > 0
        ? 'Check the list below, add where bins are collected from if you like, then tap Continue to save and move on.'
        : 'Add dates with the options below, or tap Continue to skip this step for now.';
    banner.classList.toggle('hub-setup-bin-summary-banner--empty', count === 0);
  }

  function renderPattern() {
    wrap.replaceChildren();
    patternWizard = createBinPatternWizard(draftSchedule, (nextDraft) => {
      mergeDraft(nextDraft);
    });
    wrap.append(patternWizard.wrap);
  }

  function renderPaste() {
    wrap.replaceChildren();
    const intro = document.createElement('p');
    intro.className = 'settings-help subtle';
    intro.textContent = 'Paste dates from a council PDF, email, or spreadsheet.';

    const previewButton = document.createElement('button');
    previewButton.type = 'button';
    previewButton.className = 'settings-action-button hub-setup-bin-add-button';
    previewButton.textContent = 'Parse & preview';

    previewButton.addEventListener('click', () => {
      const parsed = parseBinSchedulePaste(pasteInput.value);
      if (!parsed.validCount) {
        pastePreview.hidden = false;
        pastePreview.textContent = `Could not parse any complete lines (${parsed.unknownCount} need attention).`;
        return;
      }
      const { household, gardenWaste } = binScheduleEntriesFromParsed(parsed.entries);
      mergeDraft({ household, gardenWaste });
      completeSubWizard('paste');
    });

    wrap.append(intro, pasteWrap, previewButton, pastePreview);
  }

  function render() {
    if (mode === 'pattern') renderPattern();
    else if (mode === 'paste') renderPaste();
    else if (mode === 'summary') renderSummary();
    else renderChooser();
    options.onLayoutChange?.();
  }

  render();

  return {
    wrap,
    getUseCase: () => useCase,
    readBinSchedule() {
      return inferBinSchedulePeriod(
        normalizeBinSchedule({
          ...draftSchedule,
          ...readLocationFields()
        })
      );
    },
    isInSubWizard() {
      return mode === 'pattern' || mode === 'paste';
    },
    getFooterState() {
      if (mode === 'pattern' && patternWizard) {
        const onReview = patternWizard.progressLabel().includes('Step 4');
        return {
          backConsumes: true,
          nextLabel: onReview ? 'Use these dates' : 'Next'
        };
      }
      if (mode === 'paste') {
        return { backConsumes: true, nextLabel: 'Back to summary' };
      }
      return { backConsumes: false, nextLabel: '' };
    },
    /** @returns {true | 'toast'} */
    handleBack() {
      if (mode === 'pattern' && patternWizard?.handleBack()) {
        patternWizard.render();
        return true;
      }
      if (mode === 'pattern' || mode === 'paste') {
        mode = hasConfiguredBinSchedule(draftSchedule) ? 'summary' : 'chooser';
        render();
        return true;
      }
      return false;
    },
    /**
     * @returns {true | 'pick-stream' | 'pick-pattern' | 'missing-start' | 'no-dates' | false}
     */
    handleContinue() {
      if (mode === 'pattern' && patternWizard) {
        const result = patternWizard.handleContinue();
        if (result === true) {
          patternWizard.render();
          return true;
        }
        if (typeof result === 'string') return result;
        mergeDraft(patternWizard.finish());
        completeSubWizard('pattern');
        return true;
      }
      if (mode === 'paste') {
        mode = hasConfiguredBinSchedule(draftSchedule) ? 'summary' : 'chooser';
        render();
        return true;
      }
      return false;
    }
  };
}
