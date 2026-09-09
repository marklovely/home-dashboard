/**
 * Hub setup bins step — entry chooser + nested pattern/paste flows.
 */

import {
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

/** @typedef {'entry' | 'pattern' | 'paste'} BinHubPanelMode */

/**
 * @param {Record<string, unknown>} profile
 * @param {import('./hubSetupHelpContent.js').HubUseCase} useCase
 */
export function createBinScheduleHubPanel(profile = {}, useCase = 'owner') {
  let mode = /** @type {BinHubPanelMode} */ ('entry');
  let draftSchedule = readBinScheduleFromProfile(profile);
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
    draftSchedule = readBinScheduleFromProfile({ ...draftSchedule, ...partial });
  }

  function readLocationFields() {
    return {
      collectionLocation: location.input.value.trim(),
      councilUrl: councilUrl.input.value.trim(),
      alertHoursBefore: alertHours.readAlertHoursBefore()
    };
  }

  function renderEntry() {
    wrap.replaceChildren();
    wrap.append(createSetupIntro(guestCopy.intro));

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

    wrap.append(choices, location.wrap, councilUrl.wrap, alertHours.wrap);

    entryReviewList = createBinScheduleReviewList({
      entries: reviewEntriesFromSchedule(draftSchedule),
      onChange: (entries) => {
        mergeDraft(scheduleFromReviewEntries(entries));
        entryReviewList?.setEntries(entries);
      }
    });
    wrap.append(entryReviewList.wrap);

    const skipNote = document.createElement('p');
    skipNote.className = 'subtle';
    skipNote.textContent =
      'You can skip adding dates now and finish setup — open Settings → Bin reminders later, or use the council link in the Bins app.';
    wrap.append(skipNote);
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
      pastePreview.hidden = false;
      pastePreview.textContent = `Added ${parsed.validCount} date${parsed.validCount === 1 ? '' : 's'}${parsed.unknownCount ? ` · ${parsed.unknownCount} line${parsed.unknownCount === 1 ? '' : 's'} skipped` : ''}.`;
      mode = 'entry';
      render();
    });

    wrap.append(intro, pasteWrap, previewButton, pastePreview);
  }

  function render() {
    if (mode === 'pattern') renderPattern();
    else if (mode === 'paste') renderPaste();
    else renderEntry();
  }

  render();

  return {
    wrap,
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
        return { backConsumes: true, nextLabel: 'Back to options' };
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
        mode = 'entry';
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
        mode = 'entry';
        render();
        return true;
      }
      if (mode === 'paste') {
        mode = 'entry';
        render();
        return true;
      }
      return false;
    }
  };
}
