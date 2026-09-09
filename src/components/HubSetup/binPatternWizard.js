/**
 * Nested pattern wizard for bin schedules (does not change hub setup step index).
 */

import {
  buildAlternatingBinScheduleEntries,
  buildBinScheduleEntriesFromRepeat,
  defaultRepeatUntilDate,
  resolveRepeatUntilDate
} from '../../lib/binScheduleRepeat.js';
import { readBinScheduleFromProfile } from '../../lib/binScheduleProfile.js';
import { createSetupField, createSetupSelect } from './hubSetupFields.js';
import {
  createBinScheduleReviewList,
  reviewEntriesFromSchedule,
  scheduleFromReviewEntries
} from './binScheduleReviewList.js';

const WEEKDAY_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' }
];

const PATTERN_SUB_STEPS = ['streams', 'pattern', 'dates', 'review'];

/**
 * @param {import('../../lib/binScheduleProfile.js').BinScheduleProfile} schedule
 * @param {(draft: import('../../lib/binScheduleProfile.js').BinScheduleProfile) => void} onDraftChange
 */
export function createBinPatternWizard(schedule, onDraftChange) {
  let subStep = 0;
  let includeRubbish = true;
  let includeRecycling = true;
  let includeGarden = (schedule.gardenWaste ?? []).length > 0;
  /** @type {'alternating' | 'weekly' | 'fortnight-same'} */
  let householdPattern = 'alternating';
  /** @type {ReturnType<typeof reviewEntriesFromSchedule>} */
  let reviewEntries = reviewEntriesFromSchedule(schedule);

  const wrap = document.createElement('div');
  wrap.className = 'hub-setup-bin-pattern-wizard';

  const progress = document.createElement('p');
  progress.className = 'hub-setup-bin-subwizard-progress subtle';

  const body = document.createElement('div');
  body.className = 'hub-setup-bin-subwizard-body';

  const normalDay = createSetupSelect(
    'Usual collection weekday (optional)',
    schedule.normalCollectionDay,
    WEEKDAY_OPTIONS,
    { hint: 'Helps guests spot when collection has moved for bank holidays.' }
  );

  const nextRubbish = createSetupField('Next general waste date', '', {
    type: 'date',
    required: true,
    hint: 'From your council calendar — the next rubbish / general waste collection.'
  });

  const nextRecycling = createSetupField('Next recycling date (optional)', '', {
    type: 'date',
    hint: 'Only needed if rubbish and recycling are not simply alternating every two weeks.'
  });

  const gardenWeekday = createSetupSelect('Garden waste weekday', '', WEEKDAY_OPTIONS);
  const nextGarden = createSetupField('Next garden waste date', '', { type: 'date' });
  const gardenRepeatWeeks = createSetupField('Garden waste every (weeks)', '2', {
    type: 'number',
    inputMode: 'numeric'
  });
  gardenRepeatWeeks.input.min = '1';
  gardenRepeatWeeks.input.max = '52';

  const untilDate = createSetupField('Generate dates until', defaultRepeatUntilDate(new Date().toISOString().slice(0, 10)), {
    type: 'date'
  });

  /** @type {ReturnType<typeof createBinScheduleReviewList> | null} */
  let reviewList = null;

  function progressLabel() {
    return `Pattern setup · Step ${subStep + 1} of ${PATTERN_SUB_STEPS.length}`;
  }

  function renderStreamsStep() {
    body.replaceChildren();
    const intro = document.createElement('p');
    intro.className = 'settings-help subtle';
    intro.textContent = 'Which bins do you put out for collection?';

    const list = document.createElement('div');
    list.className = 'hub-setup-bin-stream-list';

    for (const [label, key] of /** @type {const} */ ([
      ['General waste / rubbish', 'rubbish'],
      ['Recycling & glass', 'recycling'],
      ['Garden / green waste', 'garden']
    ])) {
      const row = document.createElement('label');
      row.className = 'hub-setup-checkbox-field';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'hub-setup-checkbox';
      input.checked =
        key === 'rubbish' ? includeRubbish : key === 'recycling' ? includeRecycling : includeGarden;
      input.addEventListener('change', () => {
        if (key === 'rubbish') includeRubbish = input.checked;
        if (key === 'recycling') includeRecycling = input.checked;
        if (key === 'garden') includeGarden = input.checked;
      });
      const text = document.createElement('span');
      text.textContent = label;
      row.append(input, text);
      list.append(row);
    }

    body.append(intro, list);
  }

  function renderPatternStep() {
    body.replaceChildren();
    const intro = document.createElement('p');
    intro.className = 'settings-help subtle';
    intro.textContent = 'How do household bins (general waste and recycling) usually run?';

    const options = document.createElement('div');
    options.className = 'hub-setup-bin-pattern-options';

    for (const [value, label, hint] of /** @type {const} */ ([
      ['alternating', 'Every 2 weeks — bins alternate', 'Typical UK council calendar (rubbish one week, recycling the next).'],
      ['weekly', 'Every week — same bin each time', 'One stream on the same weekday every week.'],
      ['fortnight-same', 'Every 2 weeks — same bin each time', 'One stream every fortnight.']
    ])) {
      const row = document.createElement('label');
      row.className = 'hub-setup-bin-pattern-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'household-pattern';
      input.value = value;
      input.checked = householdPattern === value;
      input.addEventListener('change', () => {
        if (input.checked) householdPattern = value;
      });
      const copy = document.createElement('span');
      copy.innerHTML = `<strong>${label}</strong><br><span class="subtle">${hint}</span>`;
      row.append(input, copy);
      options.append(row);
    }

    body.append(intro, options);
  }

  function renderDatesStep() {
    body.replaceChildren();
    const householdBlock = document.createElement('div');
    householdBlock.className = 'hub-setup-bin-subsection';
    const householdTitle = document.createElement('p');
    householdTitle.className = 'settings-subsection-title';
    householdTitle.textContent = 'Household bins';
    householdBlock.append(
      householdTitle,
      normalDay.wrap,
      nextRubbish.wrap,
      householdPattern === 'alternating' ? nextRecycling.wrap : null
    );

    body.append(householdBlock);

    if (includeGarden) {
      const gardenBlock = document.createElement('div');
      gardenBlock.className = 'hub-setup-bin-subsection';
      const gardenTitle = document.createElement('p');
      gardenTitle.className = 'settings-subsection-title';
      gardenTitle.textContent = 'Garden waste';
      gardenBlock.append(gardenTitle, gardenWeekday.wrap, nextGarden.wrap, gardenRepeatWeeks.wrap);
      body.append(gardenBlock);
    }

    body.append(untilDate.wrap);
  }

  function generateEntries() {
    const until = resolveRepeatUntilDate(
      nextRubbish.input.value.trim(),
      untilDate.input.value.trim(),
      defaultRepeatUntilDate(nextRubbish.input.value.trim())
    );
    if (untilDate.input.value.trim() !== until) untilDate.input.value = until;

    /** @type {ReturnType<typeof reviewEntriesFromSchedule>} */
    const generated = [];

    if (includeRubbish || includeRecycling) {
      const start = nextRubbish.input.value.trim();
      if (!start) return generated;

      if (householdPattern === 'alternating' && includeRubbish && includeRecycling) {
        for (const entry of buildAlternatingBinScheduleEntries({
          startDate: start,
          startType: 'rubbish',
          intervalWeeks: 2,
          untilDate: until
        })) {
          generated.push({
            id: crypto.randomUUID(),
            date: entry.date,
            type: entry.type,
            bankHolidayChange: entry.bankHolidayChange
          });
        }
      } else if (includeRubbish) {
        const repeatId = householdPattern === 'weekly' ? '1week' : '2weeks';
        for (const entry of buildBinScheduleEntriesFromRepeat({
          startDate: start,
          type: 'rubbish',
          repeatId,
          untilDate: until
        })) {
          generated.push({
            id: crypto.randomUUID(),
            ...entry
          });
        }
      } else if (includeRecycling) {
        const repeatId = householdPattern === 'weekly' ? '1week' : '2weeks';
        const recyclingStart = nextRecycling.input.value.trim() || start;
        for (const entry of buildBinScheduleEntriesFromRepeat({
          startDate: recyclingStart,
          type: 'recycling',
          repeatId,
          untilDate: until
        })) {
          generated.push({
            id: crypto.randomUUID(),
            ...entry
          });
        }
      }
    }

    if (includeGarden) {
      const gardenStart = nextGarden.input.value.trim();
      if (gardenStart) {
        const weeks = Number(gardenRepeatWeeks.input.value) || 2;
        for (const entry of buildBinScheduleEntriesFromRepeat({
          startDate: gardenStart,
          type: 'gardenWaste',
          repeatId: weeks === 1 ? '1week' : 'custom',
          customWeeks: weeks,
          untilDate: until
        })) {
          generated.push({
            id: crypto.randomUUID(),
            date: entry.date,
            type: 'gardenWaste',
            bankHolidayChange: false
          });
        }
      }
    }

    generated.sort((a, b) => a.date.localeCompare(b.date));
    return generated;
  }

  function renderReviewStep() {
    reviewList = createBinScheduleReviewList({
      entries: reviewEntries,
      onChange: (next) => {
        reviewEntries = next;
        publishDraft();
      },
      emptyMessage: 'No dates generated — go back and check your start dates.'
    });
    body.replaceChildren(reviewList.wrap);
  }

  function publishDraft() {
    const { household, gardenWaste } = scheduleFromReviewEntries(reviewEntries);
    onDraftChange(
      readBinScheduleFromProfile({
        ...schedule,
        normalCollectionDay: normalDay.select.value,
        validUntil: untilDate.input.value.trim(),
        household,
        gardenWaste
      })
    );
  }

  function render() {
    progress.textContent = progressLabel();
    if (PATTERN_SUB_STEPS[subStep] === 'streams') renderStreamsStep();
    else if (PATTERN_SUB_STEPS[subStep] === 'pattern') renderPatternStep();
    else if (PATTERN_SUB_STEPS[subStep] === 'dates') renderDatesStep();
    else renderReviewStep();
  }

  wrap.append(progress, body);
  render();

  return {
    wrap,
    isActive: () => true,
    progressLabel,
    render,
    /** @returns {boolean} true if the event was handled (stay on bins step) */
    handleBack() {
      if (subStep > 0) {
        if (subStep === 2 && !includeRubbish && !includeRecycling) {
          subStep = 0;
        } else {
          subStep -= 1;
        }
        render();
        return true;
      }
      return false;
    },
    /** @returns {boolean} true if handled (do not advance hub setup step yet) */
    handleContinue() {
      if (PATTERN_SUB_STEPS[subStep] === 'streams') {
        if (!includeRubbish && !includeRecycling && !includeGarden) {
          return 'pick-stream';
        }
        subStep += includeRubbish || includeRecycling ? 1 : 2;
        render();
        return true;
      }

      if (PATTERN_SUB_STEPS[subStep] === 'pattern') {
        subStep += 1;
        render();
        return true;
      }

      if (PATTERN_SUB_STEPS[subStep] === 'dates') {
        if ((includeRubbish || includeRecycling) && !nextRubbish.input.value.trim()) {
          return 'missing-start';
        }
        if (includeGarden && !nextGarden.input.value.trim() && !includeRubbish && !includeRecycling) {
          return 'missing-garden-start';
        }
        reviewEntries = generateEntries();
        if (!reviewEntries.length) {
          return 'no-dates';
        }
        subStep += 1;
        render();
        return true;
      }

      publishDraft();
      return false;
    },
    /** Completed pattern wizard — merge into parent */
    finish() {
      publishDraft();
      return readBinScheduleFromProfile({
        ...schedule,
        normalCollectionDay: normalDay.select.value,
        validUntil: untilDate.input.value.trim(),
        ...scheduleFromReviewEntries(reviewEntries)
      });
    },
    reset() {
      subStep = 0;
      render();
    }
  };
}
