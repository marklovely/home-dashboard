/**
 * Editable bin collection date list (shared by pattern wizard, paste, settings).
 */

import { showConfirmDialog } from '../ConfirmDialog/confirmDialog.js';

/**
 * @param {'rubbish' | 'recycling' | 'gardenWaste'} type
 */
function typeLabel(type) {
  if (type === 'recycling') return 'Recycling & glass';
  if (type === 'gardenWaste') return 'Garden waste';
  return 'Rubbish / general waste';
}

/**
 * @typedef {{ id: string, date: string, type: 'rubbish' | 'recycling' | 'gardenWaste', bankHolidayChange: boolean }} BinReviewEntry

/**
 * @param {import('../../lib/binScheduleProfile.js').BinScheduleProfile} schedule
 * @returns {BinReviewEntry[]}
 */
export function reviewEntriesFromSchedule(schedule) {
  /** @type {BinReviewEntry[]} */
  const entries = [];
  for (const entry of schedule.household ?? []) {
    entries.push({
      id: crypto.randomUUID(),
      date: entry.date,
      type: entry.type,
      bankHolidayChange: Boolean(entry.bankHolidayChange)
    });
  }
  for (const entry of schedule.gardenWaste ?? []) {
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
 * @param {BinReviewEntry[]} entries
 */
export function scheduleFromReviewEntries(entries) {
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
 * @param {Object} options
 * @param {BinReviewEntry[]} options.entries
 * @param {(entries: BinReviewEntry[]) => void} options.onChange
 * @param {string} [options.emptyMessage]
 */
export function createBinScheduleReviewList({ entries, onChange, emptyMessage }) {
  const wrap = document.createElement('div');
  wrap.className = 'hub-setup-bin-review';

  const listToolbar = document.createElement('div');
  listToolbar.className = 'hub-setup-bin-list-toolbar';

  const summary = document.createElement('p');
  summary.className = 'hub-setup-bin-list-summary subtle';
  summary.setAttribute('aria-live', 'polite');

  const clearAllButton = document.createElement('button');
  clearAllButton.type = 'button';
  clearAllButton.className = 'settings-action-button settings-action-button--secondary hub-setup-bin-clear-all-button';
  clearAllButton.textContent = 'Clear all dates';
  clearAllButton.addEventListener('click', () => {
    if (!entries.length) return;
    const count = entries.length;
    void showConfirmDialog({
      title: 'Clear all collection dates?',
      message: `Remove all ${count} collection date${count === 1 ? '' : 's'} from this list? Location and reminder settings are kept.`,
      confirmLabel: 'Clear all',
      cancelLabel: 'Keep dates',
      danger: true
    }).then((confirmed) => {
      if (!confirmed) return;
      entries = [];
      onChange(entries);
      render();
    });
  });

  listToolbar.append(summary, clearAllButton);

  const listScroll = document.createElement('div');
  listScroll.className = 'hub-setup-bin-entry-list-scroll';

  const listHost = document.createElement('div');
  listHost.className = 'hub-setup-bin-entry-list';

  function render() {
    listHost.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'subtle hub-setup-bin-empty';
      empty.textContent =
        emptyMessage ??
        'No dates yet — use the pattern wizard or paste dates from your council calendar.';
      listHost.append(empty);
      summary.textContent = 'No collection dates added yet.';
      clearAllButton.hidden = true;
      return;
    }

    clearAllButton.hidden = false;
    summary.textContent = `${entries.length} collection date${entries.length === 1 ? '' : 's'}.`;
    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'hub-setup-bin-entry-row';

      const text = document.createElement('span');
      text.className = 'hub-setup-bin-entry-text';
      const bankHolidayNote = entry.bankHolidayChange ? ' · changed day' : '';
      text.textContent = `${entry.date} — ${typeLabel(entry.type)}${bankHolidayNote}`;

      const toggleChanged = document.createElement('button');
      toggleChanged.type = 'button';
      toggleChanged.className = 'hub-setup-bin-toggle-changed';
      toggleChanged.textContent = entry.bankHolidayChange ? 'Unmark changed' : 'Changed day';
      toggleChanged.hidden = entry.type === 'gardenWaste';
      toggleChanged.addEventListener('click', () => {
        entries = entries.map((item) =>
          item.id === entry.id ? { ...item, bankHolidayChange: !item.bankHolidayChange } : item
        );
        onChange(entries);
        render();
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'hub-setup-bin-remove-button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        entries = entries.filter((item) => item.id !== entry.id);
        onChange(entries);
        render();
      });

      row.append(text, toggleChanged, remove);
      listHost.append(row);
    }
  }

  listScroll.append(listHost);
  wrap.append(listToolbar, listScroll);
  render();

  return {
    wrap,
    render,
    setEntries(nextEntries) {
      entries = nextEntries.map((entry) => ({ ...entry }));
      render();
    }
  };
}
