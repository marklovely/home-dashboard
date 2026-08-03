/**
 * Manual bin schedule editor for hub setup and Settings.
 */

import {
  inferBinSchedulePeriod,
  normalizeBinSchedule,
  readBinScheduleFromProfile
} from '../../lib/binScheduleProfile.js';
import { HUB_SETUP_FIELD_HELP } from './hubSetupHelpContent.js';
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

/**
 * @param {Record<string, unknown>} [profile]
 */
export function createBinScheduleFields(profile = {}) {
  const schedule = readBinScheduleFromProfile(profile);

  const wrap = document.createElement('div');
  wrap.className = 'hub-setup-bin-schedule';

  wrap.append(
    createSetupIntro(
      'Add collection dates from your council calendar. You can skip and add them later in Settings → Open setup wizard. Each date drives the home screen bin reminder.'
    )
  );

  const location = createSetupField(
    'Where are bins collected from?',
    schedule.collectionLocation,
    {
      placeholder: 'End of the close, left-hand side',
      ...HUB_SETUP_FIELD_HELP.binCollectionLocation
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
    HUB_SETUP_FIELD_HELP.binNormalDay
  );

  const validFrom = createSetupField('Schedule valid from (optional)', schedule.validFrom, {
    type: 'date',
    ...HUB_SETUP_FIELD_HELP.binValidFrom
  });

  const validUntil = createSetupField('Schedule valid until (optional)', schedule.validUntil, {
    type: 'date',
    ...HUB_SETUP_FIELD_HELP.binValidUntil
  });

  const entryPanel = document.createElement('fieldset');
  entryPanel.className = 'hub-setup-bin-entry-panel';
  entryPanel.innerHTML = '<legend class="hub-setup-bin-entry-legend">Add a collection date</legend>';

  const entryDate = createSetupField('Date', '', { type: 'date', required: true });
  const entryType = createSetupSelect('Bin type', 'rubbish', BIN_TYPE_OPTIONS);

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
  addButton.className = 'settings-action-button settings-action-button--secondary hub-setup-bin-add-button';
  addButton.textContent = 'Add date';

  entryPanel.append(entryDate.wrap, entryType.wrap, bankHolidayWrap, addButton);

  const listHost = document.createElement('div');
  listHost.className = 'hub-setup-bin-entry-list';
  listHost.setAttribute('aria-live', 'polite');

  /** @type {{ id: string, date: string, type: 'rubbish' | 'recycling' | 'gardenWaste', bankHolidayChange: boolean }[]} */
  let entries = [];

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

  function typeLabel(type) {
    if (type === 'recycling') return 'Recycling & glass';
    if (type === 'gardenWaste') return 'Garden waste';
    return 'Rubbish / general waste';
  }

  function renderEntryList() {
    listHost.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'subtle hub-setup-bin-empty';
      empty.textContent = 'No dates added yet — add each collection from your council calendar, or skip this step.';
      listHost.append(empty);
      return;
    }

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

  addButton.addEventListener('click', () => {
    const date = entryDate.input.value.trim();
    if (!date) return;
    const type = /** @type {'rubbish' | 'recycling' | 'gardenWaste'} */ (entryType.select.value);
    entries.push({
      id: crypto.randomUUID(),
      date,
      type,
      bankHolidayChange: type !== 'gardenWaste' && bankHolidayInput.checked
    });
    entries.sort((a, b) => a.date.localeCompare(b.date));
    entryDate.input.value = '';
    bankHolidayInput.checked = false;
    renderEntryList();
  });

  renderEntryList();

  wrap.append(
    location.wrap,
    councilUrl.wrap,
    normalDay.wrap,
    validFrom.wrap,
    validUntil.wrap,
    entryPanel,
    listHost
  );

  return {
    wrap,
    readBinSchedule() {
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

      return inferBinSchedulePeriod(
        normalizeBinSchedule({
          collectionLocation: location.input.value.trim(),
          councilUrl: councilUrl.input.value.trim(),
          normalCollectionDay: normalDay.select.value,
          validFrom: validFrom.input.value.trim(),
          validUntil: validUntil.input.value.trim(),
          household,
          gardenWaste
        })
      );
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
    placeholder: 'https://… or webcal://…',
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
