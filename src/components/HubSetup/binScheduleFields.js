/**
 * Manual bin schedule editor for hub setup and Settings.
 */

import {
  BIN_ALERT_HOURS_OPTIONS,
  DEFAULT_BIN_ALERT_HOURS_BEFORE,
  inferBinSchedulePeriod,
  normalizeBinSchedule,
  readBinScheduleFromProfile
} from '../../lib/binScheduleProfile.js';
import {
  BIN_REPEAT_PRESETS,
  buildBinScheduleEntriesFromRepeat,
  defaultRepeatUntilDate
} from '../../lib/binScheduleRepeat.js';
import {
  getBinScheduleFieldHelp,
  getBinScheduleGuestCopy,
  HUB_SETUP_FIELD_HELP
} from './hubSetupHelpContent.js';
import { createSetupField, createSetupIntro, createSetupSelect } from './hubSetupFields.js';

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

const BIN_TYPE_OPTIONS = [
  { value: 'rubbish', label: 'Rubbish / general waste' },
  { value: 'recycling', label: 'Recycling & glass' },
  { value: 'gardenWaste', label: 'Garden waste' }
];

/** @typedef {{ id: string, date: string, type: 'rubbish' | 'recycling' | 'gardenWaste', bankHolidayChange: boolean }} BinScheduleDraftEntry */

/**
 * @param {import('../../lib/binScheduleProfile.js').BinScheduleProfile} schedule
 * @returns {BinScheduleDraftEntry[]}
 */
function draftEntriesFromSchedule(schedule) {
  /** @type {BinScheduleDraftEntry[]} */
  const entries = [];
  for (const entry of schedule.household) {
    entries.push({
      id: crypto.randomUUID(),
      date: entry.date,
      type: entry.type,
      bankHolidayChange: Boolean(entry.bankHolidayChange)
    });
  }
  for (const entry of schedule.gardenWaste) {
    entries.push({
      id: crypto.randomUUID(),
      date: entry.date,
      type: 'gardenWaste',
      bankHolidayChange: false
    });
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return entries;
}

/**
 * @param {BinScheduleDraftEntry[]} entries
 */
function splitDraftEntries(entries) {
  /** @type {import('../../lib/binScheduleProfile.js').BinScheduleHouseholdEntry[]} */
  const household = [];
  /** @type {import('../../lib/binScheduleProfile.js').BinScheduleGardenEntry[]} */
  const gardenWaste = [];

  for (const entry of entries) {
    if (entry.type === 'gardenWaste') {
      gardenWaste.push({ date: entry.date });
    } else {
      household.push({
        date: entry.date,
        type: entry.type,
        bankHolidayChange: entry.bankHolidayChange
      });
    }
  }

  return { household, gardenWaste };
}

/**
 * @param {'rubbish' | 'recycling' | 'gardenWaste'} type
 */
function typeLabel(type) {
  if (type === 'recycling') return 'Recycling & glass';
  if (type === 'gardenWaste') return 'Garden waste';
  return 'Rubbish / general waste';
}

/**
 * @param {Object} [options]
 * @param {import('../../lib/binScheduleProfile.js').BinScheduleProfile} [options.schedule]
 * @param {() => string} [options.getRepeatUntilFallback] Called when repeat-until is blank on add.
 */
export function createBinScheduleDateEditor(options = {}) {
  const schedule = options.schedule ?? normalizeBinSchedule({});
  /** @type {BinScheduleDraftEntry[]} */
  let entries = draftEntriesFromSchedule(schedule);

  const wrap = document.createElement('div');
  wrap.className = 'hub-setup-bin-date-editor';

  const entryPanel = document.createElement('fieldset');
  entryPanel.className = 'hub-setup-bin-entry-panel';
  entryPanel.innerHTML =
    '<legend class="hub-setup-bin-entry-legend">Add collection dates</legend>';

  const entryIntro = document.createElement('p');
  entryIntro.className = 'settings-help subtle hub-setup-bin-entry-intro';
  entryIntro.textContent =
    'Choose a date and bin type below, then tap Add to collection list. Repeating patterns add a full year of dates in one go — you can remove any you do not need.';
  entryPanel.append(entryIntro);

  const entryDate = createSetupField('First collection date', '', { type: 'date', required: true });
  const entryType = createSetupSelect('Bin type', 'rubbish', BIN_TYPE_OPTIONS);
  const entryRepeat = createSetupSelect('Repeat', 'none', BIN_REPEAT_PRESETS, {
    hint: 'Generate future dates from your council pattern — you can still remove individual dates below.'
  });

  const customWeeksWrap = createSetupField('Every how many weeks?', String(3), {
    type: 'number',
    inputMode: 'numeric',
    placeholder: '3',
    hint: 'Used when repeat is set to Custom.'
  });
  customWeeksWrap.input.min = '1';
  customWeeksWrap.input.max = '52';
  customWeeksWrap.input.step = '1';
  customWeeksWrap.wrap.hidden = true;
  customWeeksWrap.wrap.classList.add('hub-setup-bin-custom-weeks');

  const repeatUntil = createSetupField('Repeat until', schedule.validUntil || '', {
    type: 'date',
    hint: 'Defaults to one year after the first date if left blank.'
  });
  repeatUntil.wrap.hidden = true;
  repeatUntil.wrap.classList.add('hub-setup-bin-repeat-until');

  const bankHolidayWrap = document.createElement('label');
  bankHolidayWrap.className = 'hub-setup-checkbox-field';
  const bankHolidayInput = document.createElement('input');
  bankHolidayInput.type = 'checkbox';
  bankHolidayInput.className = 'hub-setup-checkbox';
  const bankHolidayText = document.createElement('span');
  bankHolidayText.textContent = 'Changed day (bank holiday schedule)';
  bankHolidayWrap.append(bankHolidayInput, bankHolidayText);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'settings-action-button hub-setup-bin-add-button';
  addButton.textContent = 'Add to collection list';

  entryPanel.append(
    entryDate.wrap,
    entryType.wrap,
    entryRepeat.wrap,
    customWeeksWrap.wrap,
    repeatUntil.wrap,
    bankHolidayWrap,
    addButton
  );

  const listSummary = document.createElement('p');
  listSummary.className = 'hub-setup-bin-list-summary subtle';
  listSummary.setAttribute('aria-live', 'polite');

  const listScroll = document.createElement('div');
  listScroll.className = 'hub-setup-bin-entry-list-scroll';

  const listHost = document.createElement('div');
  listHost.className = 'hub-setup-bin-entry-list';

  function syncRepeatFields() {
    const repeating = entryRepeat.select.value !== 'none';
    repeatUntil.wrap.hidden = !repeating;
    customWeeksWrap.wrap.hidden = entryRepeat.select.value !== 'custom';
    addButton.textContent = repeating ? 'Add dates to list' : 'Add to collection list';
    if (repeating && !repeatUntil.input.value.trim()) {
      const start = entryDate.input.value.trim();
      if (start) {
        repeatUntil.input.value =
          options.getRepeatUntilFallback?.() || schedule.validUntil || defaultRepeatUntilDate(start);
      }
    }
  }

  entryRepeat.select.addEventListener('change', syncRepeatFields);
  entryDate.input.addEventListener('change', () => {
    if (entryRepeat.select.value !== 'none' && !repeatUntil.input.value.trim()) {
      const start = entryDate.input.value.trim();
      if (start) {
        repeatUntil.input.value =
          options.getRepeatUntilFallback?.() || schedule.validUntil || defaultRepeatUntilDate(start);
      }
    }
  });

  function renderEntryList() {
    listHost.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'subtle hub-setup-bin-empty';
      empty.textContent =
        'No dates yet — add your first collection above, or skip this step and come back later in Settings.';
      listHost.append(empty);
      listSummary.textContent = 'No collection dates added yet.';
      return;
    }

    listSummary.textContent = `${entries.length} collection date${entries.length === 1 ? '' : 's'} added. Continue below when you are ready.`;

    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'hub-setup-bin-entry-row';

      const text = document.createElement('span');
      text.className = 'hub-setup-bin-entry-text';
      const bankHolidayNote = entry.bankHolidayChange ? ' · changed day' : '';
      text.textContent = `${entry.date} — ${typeLabel(entry.type)}${bankHolidayNote}`;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'hub-setup-bin-remove-button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        entries = entries.filter((item) => item.id !== entry.id);
        renderEntryList();
      });

      row.append(text, remove);
      listHost.append(row);
    }
  }

  function entryKey(date, type) {
    return `${date}:${type}`;
  }

  addButton.addEventListener('click', () => {
    const startDate = entryDate.input.value.trim();
    if (!startDate) return;

    const type = /** @type {'rubbish' | 'recycling' | 'gardenWaste'} */ (entryType.select.value);
    const repeatId = entryRepeat.select.value;
    const customWeeks = Number(customWeeksWrap.input.value);
    const untilDate =
      repeatUntil.input.value.trim() ||
      options.getRepeatUntilFallback?.() ||
      schedule.validUntil ||
      defaultRepeatUntilDate(startDate);

    const generated = buildBinScheduleEntriesFromRepeat({
      startDate,
      type,
      repeatId,
      customWeeks,
      untilDate,
      bankHolidayChange: type !== 'gardenWaste' && bankHolidayInput.checked
    });

    const existingKeys = new Set(entries.map((entry) => entryKey(entry.date, entry.type)));
    for (const generatedEntry of generated) {
      const key = entryKey(generatedEntry.date, generatedEntry.type);
      if (existingKeys.has(key)) continue;
      entries.push({
        id: crypto.randomUUID(),
        date: generatedEntry.date,
        type: generatedEntry.type,
        bankHolidayChange: generatedEntry.bankHolidayChange
      });
      existingKeys.add(key);
    }

    entries.sort((a, b) => a.date.localeCompare(b.date));
    entryDate.input.value = '';
    bankHolidayInput.checked = false;
    renderEntryList();
  });

  syncRepeatFields();
  renderEntryList();

  listScroll.append(listHost);
  wrap.append(entryPanel, listSummary, listScroll);

  return {
    wrap,
    readDraftEntries() {
      return entries.map((entry) => ({ ...entry }));
    },
    readHouseholdAndGarden() {
      return splitDraftEntries(entries);
    }
  };
}

/**
 * @param {Record<string, unknown>} [profile]
 * @param {import('./hubSetupHelpContent.js').HubUseCase} [useCase]
 */
export function createBinScheduleFields(profile = {}, useCase = 'owner') {
  const schedule = readBinScheduleFromProfile(profile);
  const guestCopy = getBinScheduleGuestCopy(useCase);

  const wrap = document.createElement('div');
  wrap.className = 'hub-setup-bin-schedule';

  wrap.append(createSetupIntro(guestCopy.intro));

  const location = createSetupField(
    'Where are bins collected from?',
    schedule.collectionLocation,
    {
      placeholder: 'End of the close, left-hand side',
      ...getBinScheduleFieldHelp(useCase)
    }
  );

  const councilUrl = createSetupField('Council bins website (optional)', schedule.councilUrl, {
    placeholder: 'https://www.example.gov.uk/bins',
    type: 'url',
    ...HUB_SETUP_FIELD_HELP.binCouncilUrl
  });

  const normalDay = createSetupSelect(
    'Usual collection day (optional)',
    schedule.normalCollectionDay,
    WEEKDAY_OPTIONS,
    {
      ...HUB_SETUP_FIELD_HELP.binNormalDay,
      helpText: guestCopy.normalDayHelp
    }
  );

  const validFrom = createSetupField('Schedule valid from (optional)', schedule.validFrom, {
    type: 'date',
    ...HUB_SETUP_FIELD_HELP.binValidFrom
  });

  const validUntil = createSetupField('Schedule valid until (optional)', schedule.validUntil, {
    type: 'date',
    ...HUB_SETUP_FIELD_HELP.binValidUntil
  });

  const alertHours = createSetupSelect(
    'Remind sitters before collection',
    String(schedule.alertHoursBefore ?? DEFAULT_BIN_ALERT_HOURS_BEFORE),
    BIN_ALERT_HOURS_OPTIONS,
    HUB_SETUP_FIELD_HELP.binAlertHours
  );

  const dateEditor = createBinScheduleDateEditor({
    schedule,
    getRepeatUntilFallback: () => validUntil.input.value.trim()
  });

  wrap.append(
    location.wrap,
    councilUrl.wrap,
    normalDay.wrap,
    validFrom.wrap,
    validUntil.wrap,
    alertHours.wrap,
    dateEditor.wrap
  );

  return {
    wrap,
    readBinSchedule() {
      const { household, gardenWaste } = dateEditor.readHouseholdAndGarden();

      return inferBinSchedulePeriod(
        normalizeBinSchedule({
          collectionLocation: location.input.value.trim(),
          councilUrl: councilUrl.input.value.trim(),
          normalCollectionDay: normalDay.select.value,
          validFrom: validFrom.input.value.trim(),
          validUntil: validUntil.input.value.trim(),
          alertHoursBefore: Number(alertHours.select.value),
          household,
          gardenWaste
        })
      );
    }
  };
}

/**
 * @param {Record<string, unknown>} [profile]
 */
export function createBinAlertHoursField(profile = {}) {
  const schedule = readBinScheduleFromProfile(profile);
  const field = createSetupSelect(
    'Remind sitters before collection',
    String(schedule.alertHoursBefore ?? DEFAULT_BIN_ALERT_HOURS_BEFORE),
    BIN_ALERT_HOURS_OPTIONS,
    HUB_SETUP_FIELD_HELP.binAlertHours
  );

  return {
    wrap: field.wrap,
    readAlertHoursBefore() {
      return Number(field.select.value);
    }
  };
}

/**
 * @param {{ configured?: boolean }} [options]
 */
export function createCalendarConnectionField(options = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'hub-setup-calendar-field';

  wrap.append(
    createSetupIntro(
      'Optional — connect a personal calendar for My Day (owner-only). Paste the private subscribe link from Apple, Google, or another provider. Skip if you do not use My Day.'
    )
  );

  const field = createSetupField('Private calendar link (ICS)', '', {
    placeholder: 'https://… or webcal…',
    revealable: true,
    autocomplete: 'off',
    ...HUB_SETUP_FIELD_HELP.calendarIcsUrl
  });

  if (options.configured) {
    const hint = document.createElement('p');
    hint.className = 'subtle hub-setup-calendar-configured-hint';
    hint.textContent = 'A calendar link is already saved. Paste a new link to replace it, or leave blank to keep the current one.';
    wrap.append(hint);
  }

  wrap.append(field.wrap);

  return {
    wrap,
    input: field.input,
    readCalendarPatch() {
      const value = field.input.value.trim();
      if (!value) return {};
      return { calendar_ics_url: value };
    }
  };
}
