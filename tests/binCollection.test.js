import { describe, expect, it } from 'vitest';
import {
  GARDEN_WASTE_ACCEPTED,
  GARDEN_WASTE_NOT_ACCEPTED,
  COLLECTION_TYPES,
  formatBinLabel
} from '../src/data/binCollections/collectionTypes.js';
import {
  __buildAllCollectionEventsForTests,
  describeCollectionEvent,
  formatIsoFromDate,
  formatBinAlertPutOutLine,
  formatBinAlertLocationLine,
  getBinCollectionAlert,
  getBinCollectionHomeSummary,
  getDaysUntil,
  isBinCollectionInAlertWindow,
  getNextCollection,
  getNextGardenWasteCollection,
  getNextHouseholdCollection,
  getUpcomingCollections,
  isScheduleExpired,
  parseLocalDate,
  getUpcomingBinCollection,
  gardenWasteCollections,
  householdCollections
} from '../src/services/binCollectionService.js';
import {
  BIN_COLLECTION_LOCATION,
  getCollectionInformationCopy,
  getCollectionTimingIntro,
  getMissedBinNote
} from '../src/apps/Bins/binCollectionCopy.js';

const BANK_HOLIDAY_CASES = [
  { date: '2025-12-30', type: 'rubbish', weekday: 'Tuesday' },
  { date: '2026-01-06', type: 'recycling', weekday: 'Tuesday' },
  { date: '2026-01-12', type: 'rubbish', weekday: 'Monday' },
  { date: '2026-01-17', type: 'recycling', weekday: 'Saturday' }
];

describe('bin calendar data integrity', () => {
  it('encodes the expected household and garden counts', () => {
    expect(householdCollections).toHaveLength(57);
    expect(gardenWasteCollections).toHaveLength(28);
    expect(__buildAllCollectionEventsForTests()).toHaveLength(85);
  });

  it('preserves bank-holiday altered household dates', () => {
    for (const { date, type } of BANK_HOLIDAY_CASES) {
      const entry = householdCollections.find((row) => row.date === date);
      expect(entry, date).toBeTruthy();
      expect(entry?.type).toBe(type);
      expect(entry?.bankHolidayChange).toBe(true);
    }
  });

  it('includes known sample dates from Calendar 17 and Round G2', () => {
    expect(householdCollections.some((r) => r.date === '2026-07-31' && r.type === 'recycling')).toBe(
      true
    );
    expect(gardenWasteCollections.some((r) => r.date === '2026-08-11')).toBe(true);
  });
});

describe('binCollectionService date handling', () => {
  it('parses ISO dates at local midnight without UTC shift', () => {
    const local = parseLocalDate('2026-07-31');
    expect(local.getFullYear()).toBe(2026);
    expect(local.getMonth()).toBe(6);
    expect(local.getDate()).toBe(31);
    expect(formatIsoFromDate(local)).toBe('2026-07-31');
  });

  it('returns Today and Tomorrow correctly', () => {
    expect(getDaysUntil('2026-07-31', parseLocalDate('2026-07-31')).relative).toBe('Today');
    expect(getDaysUntil('2026-07-31', parseLocalDate('2026-07-30')).relative).toBe('Tomorrow');
  });

  it('treats late-evening UTC instants as the same local calendar day', () => {
    const asOf = new Date('2026-07-29T23:30:00');
    const next = getNextCollection(asOf);
    expect(next?.date).toBe('2026-07-31');
    expect(getDaysUntil('2026-07-31', asOf).relative).toBe('In 2 days');
  });
});

describe('binCollectionService scheduling', () => {
  it('returns next collection on an ordinary Friday recycling week', () => {
    const asOf = parseLocalDate('2026-07-29');
    const next = getNextCollection(asOf);
    expect(next?.type).toBe('recycling');
    expect(next?.date).toBe('2026-07-31');
    const described = describeCollectionEvent(next, asOf);
    expect(described.displayName).toBe(COLLECTION_TYPES.recycling.displayName);
    expect(described.binDescription).toBe('Black wheelie bin + glass box');
    expect(described.binLabel).toContain('Black wheelie bin');
  });

  it('returns collection today when due', () => {
    const asOf = parseLocalDate('2026-07-31');
    const next = getNextCollection(asOf);
    expect(next?.date).toBe('2026-07-31');
    expect(getDaysUntil(next.date, asOf).relative).toBe('Today');
  });

  it('returns collection tomorrow when due', () => {
    const asOf = parseLocalDate('2026-07-30');
    const next = getNextCollection(asOf);
    expect(next?.date).toBe('2026-07-31');
    expect(getDaysUntil(next.date, asOf).relative).toBe('Tomorrow');
  });

  it('merges household and garden events chronologically', () => {
    const upcoming = getUpcomingCollections(parseLocalDate('2026-07-29'), 6);
    expect(upcoming.map((e) => e.date)).toEqual([
      '2026-07-31',
      '2026-08-07',
      '2026-08-11',
      '2026-08-14',
      '2026-08-21',
      '2026-08-25'
    ]);
    expect(upcoming[5].type).toBe('gardenWaste');
  });

  it('surfaces bank-holiday Tuesday 30 December 2025 as next rubbish', () => {
    const asOf = parseLocalDate('2025-12-28');
    const next = getNextHouseholdCollection(asOf);
    expect(next?.date).toBe('2025-12-30');
    expect(next?.type).toBe('rubbish');
    expect(next?.bankHolidayChange).toBe(true);
  });

  for (const { date, type, weekday } of BANK_HOLIDAY_CASES) {
    it(`keeps ${weekday} ${date} as ${type} with bankHolidayChange`, () => {
      const asOf = parseLocalDate(date);
      const next = getNextHouseholdCollection(asOf);
      expect(next?.date).toBe(date);
      expect(next?.type).toBe(type);
      expect(next?.bankHolidayChange).toBe(true);
    });
  }

  it('does not return past collections as next', () => {
    const asOf = parseLocalDate('2026-08-01');
    const next = getNextCollection(asOf);
    expect(next?.date).toBe('2026-08-07');
  });

  it('selects next garden waste independently', () => {
    const asOf = parseLocalDate('2026-07-29');
    const garden = getNextGardenWasteCollection(asOf);
    expect(garden?.date).toBe('2026-08-11');
  });
});

describe('schedule expiry', () => {
  it('marks schedule expired after October 2026', () => {
    expect(isScheduleExpired(parseLocalDate('2026-10-30'))).toBe(false);
    expect(isScheduleExpired(parseLocalDate('2026-11-01'))).toBe(true);
    expect(getNextCollection(parseLocalDate('2026-11-05'))).toBeNull();
    expect(getUpcomingCollections(parseLocalDate('2026-11-05'), 3)).toEqual([]);
  });
});

describe('bin collection alerts', () => {
  it('opens the alert window 24 hours before 6am on collection day', () => {
    const collectionDate = '2026-07-31';
    expect(isBinCollectionInAlertWindow(collectionDate, new Date('2026-07-30T07:00:00'), 24)).toBe(
      true
    );
    expect(isBinCollectionInAlertWindow(collectionDate, new Date('2026-07-30T05:00:00'), 24)).toBe(
      false
    );
  });

  it('stops the alert on collection day two hours after put-out time', () => {
    const collectionDate = '2026-07-31';
    expect(isBinCollectionInAlertWindow(collectionDate, new Date('2026-07-31T07:30:00'), 24)).toBe(
      true
    );
    expect(isBinCollectionInAlertWindow(collectionDate, new Date('2026-07-31T08:00:00'), 24)).toBe(
      false
    );
    expect(isBinCollectionInAlertWindow(collectionDate, parseLocalDate('2026-08-01'), 24)).toBe(false);
  });

  it('returns a sitter alert and home summary flag when within the window', () => {
    const asOf = new Date('2026-07-30T12:00:00');
    const alert = getBinCollectionAlert(asOf, { houseSitter: true });
    expect(alert?.title).toMatch(/Black bin collection tomorrow/i);
    expect(alert?.detail).toMatch(/Black wheelie bin/i);
    expect(alert?.label).toMatch(/Recycling/i);
    expect(alert?.putOutLine).toMatch(/Put bins out by 6am tomorrow/i);
    expect(alert?.locationLine).toMatch(/Collection point:/i);

    const summary = getBinCollectionHomeSummary(asOf, { houseSitter: true });
    expect(summary.alert?.label).toBe(alert?.label);
    expect(summary.alert?.prominent).toBe(true);
  });

  it('formats put-out and location lines for collection day', () => {
    const asOf = new Date('2026-07-31T08:00:00');
    expect(formatBinAlertPutOutLine('2026-07-31', asOf)).toBe('Put bins out by 6am today');
    expect(formatBinAlertLocationLine()).toMatch(/Collection point:/);
  });

  it('returns an owner alert with the same reminder details', () => {
    const asOf = new Date('2026-07-30T12:00:00');
    const alert = getBinCollectionAlert(asOf, { houseSitter: false });
    expect(alert?.putOutLine).toMatch(/tomorrow/i);
    expect(alert?.locationLine).toMatch(/Collection point:/);
  });

  it('respects disabled alerts when hours before is zero', () => {
    const asOf = new Date('2026-07-30T12:00:00');
    expect(
      isBinCollectionInAlertWindow('2026-07-31', asOf, 0)
    ).toBe(false);
  });
});

describe('home card and wording', () => {
  it('formats owner home summary for next recycling', () => {
    const summary = getBinCollectionHomeSummary(parseLocalDate('2026-07-29'), {
      houseSitter: false
    });
    expect(summary.title).toContain('Recycling & glass');
    expect(summary.subtitle).toContain('In 2 days');
    expect(summary.subtitle).toContain('Black wheelie bin');
  });

  it('includes garden waste hint when due within a week', () => {
    const summary = getBinCollectionHomeSummary(parseLocalDate('2026-08-06'), {
      houseSitter: false
    });
    expect(summary.subtitle).toMatch(/Garden waste/i);
  });

  it('uses informative copy without commands', () => {
    const info = getCollectionInformationCopy();
    expect(info.beginLine).toMatch(/normally begin from 6am/i);
    expect(info.locationLine).toContain(BIN_COLLECTION_LOCATION);
    expect(info.title).toBe('Collection information');
    expect(getCollectionTimingIntro(true)).not.toMatch(/must|Put your|Don't forget|You must/i);
    expect(getMissedBinNote(true)).toMatch(/easthants\.gov\.uk/);
  });

  it('shows bank-holiday wording on home card for house sitter', () => {
    const summary = getBinCollectionHomeSummary(parseLocalDate('2026-01-11'), {
      houseSitter: true
    });
    expect(summary.title).toContain('Rubbish');
    expect(summary.subtitle).toMatch(/Green wheelie bin/);
    expect(summary.subtitle).toMatch(/Monday · changed collection day/);
  });

  it('maps rubbish and recycling to the correct wheelie colours', () => {
    expect(formatBinLabel(COLLECTION_TYPES.rubbish)).toMatch(/🟢 Green wheelie bin/);
    expect(formatBinLabel(COLLECTION_TYPES.recycling)).toMatch(/⚫ Black wheelie bin/);
    expect(formatBinLabel(COLLECTION_TYPES.gardenWaste)).toMatch(/🟫 Brown wheelie bin/);
  });

  it('uses owner operational detail strings and Wagtail Road location', () => {
    const info = getCollectionInformationCopy();
    expect(info.beginLine).toMatch(/6am/);
    expect(info.locationLine).toContain('Wagtail Road');
    expect(BIN_COLLECTION_LOCATION).toMatch(/Wagtail Road/);
  });
});

describe('garden waste reference content', () => {
  it('lists accepted and rejected items from the council calendar', () => {
    expect(GARDEN_WASTE_ACCEPTED).toContain('Grass cuttings');
    expect(GARDEN_WASTE_NOT_ACCEPTED).toContain('Soil');
    expect(GARDEN_WASTE_NOT_ACCEPTED).toContain('Food scraps');
  });
});

describe('offline operation', () => {
  it('does not require network for schedule lookups', () => {
    const next = getUpcomingBinCollection(parseLocalDate('2026-07-29'));
    expect(next.label).toBe('Recycling & glass');
    expect(next.relative).toBe('In 2 days');
  });
});
