import { normalizeHubCountryCode } from './hubCountries.js';

/** @typedef {'alternating' | 'weekly' | 'fortnight-same'} BinHouseholdPatternId */

/**
 * @typedef {{
 *   value: BinHouseholdPatternId,
 *   label: string,
 *   hint: string
 * }} BinPatternOption
 */

/**
 * @typedef {{
 *   countryCode: string,
 *   isUnitedKingdom: boolean,
 *   emphasizePaste: boolean,
 *   usesCouncilTerminology: boolean,
 *   introUsesCouncilCalendar: boolean,
 *   streamsIntro: string,
 *   streamLabels: { rubbish: string, recycling: string, garden: string },
 *   patternIntro: string,
 *   patternOptions: BinPatternOption[],
 *   defaultHouseholdPattern: BinHouseholdPatternId,
 *   nextHouseholdDateLabel: string,
 *   nextHouseholdDateHint: string,
 *   nextRecyclingHint: string,
 *   normalDayHint: string,
 *   chooserPatternTitle: string,
 *   chooserPatternDetail: string,
 *   chooserPasteTitle: string,
 *   chooserPasteDetail: string,
 *   chooserPdfTitle: string,
 *   chooserPdfDetail: string,
 *   showCouncilPdfUpload: boolean,
 *   pasteIntro: string,
 *   councilUrlLabel: string,
 *   councilUrlPlaceholder: string
 * }} BinScheduleLocale
 */

/** @type {BinPatternOption[]} */
const GB_PATTERN_OPTIONS = [
  {
    value: 'alternating',
    label: 'Every 2 weeks — bins alternate',
    hint: 'Typical UK council calendar (rubbish one week, recycling the next).'
  },
  {
    value: 'weekly',
    label: 'Every week — same bin each time',
    hint: 'One stream on the same weekday every week.'
  },
  {
    value: 'fortnight-same',
    label: 'Every 2 weeks — same bin each time',
    hint: 'One stream every fortnight.'
  }
];

/** @type {BinPatternOption[]} */
const GENERIC_PATTERN_OPTIONS = [
  {
    value: 'weekly',
    label: 'Every week',
    hint: 'The same bin goes out on the same weekday each week.'
  },
  {
    value: 'fortnight-same',
    label: 'Every 2 weeks',
    hint: 'The same bin goes out every other week.'
  }
];

/**
 * Country-aware copy and pattern options for the bin schedule wizard.
 * @param {string | undefined | null} hubCountryCode
 * @returns {BinScheduleLocale}
 */
export function getBinScheduleLocale(hubCountryCode) {
  const countryCode = normalizeHubCountryCode(hubCountryCode);
  const isUnitedKingdom = countryCode === 'GB';
  const emphasizePaste = countryCode === 'OTHER';

  return {
    countryCode,
    isUnitedKingdom,
    emphasizePaste,
    usesCouncilTerminology: isUnitedKingdom,
    introUsesCouncilCalendar: isUnitedKingdom,
    streamsIntro: 'Which bins do you put out for collection?',
    streamLabels: isUnitedKingdom
      ? {
          rubbish: 'General waste / rubbish',
          recycling: 'Recycling & glass',
          garden: 'Garden / green waste'
        }
      : {
          rubbish: 'General waste / trash',
          recycling: 'Recycling',
          garden: 'Yard / green waste'
        },
    patternIntro: isUnitedKingdom
      ? 'How do household bins (general waste and recycling) usually run?'
      : 'How often are household bins collected?',
    patternOptions: isUnitedKingdom ? GB_PATTERN_OPTIONS : GENERIC_PATTERN_OPTIONS,
    defaultHouseholdPattern: isUnitedKingdom ? 'alternating' : 'weekly',
    nextHouseholdDateLabel: isUnitedKingdom ? 'Next general waste date' : 'Next collection date',
    nextHouseholdDateHint: isUnitedKingdom
      ? 'From your council calendar — the next rubbish / general waste collection.'
      : 'The next date this bin is collected.',
    nextRecyclingHint: isUnitedKingdom
      ? 'Only needed if rubbish and recycling are not simply alternating every two weeks.'
      : 'Only needed if recycling is on a different schedule.',
    normalDayHint: isUnitedKingdom
      ? 'Helps guests spot when collection has moved for bank holidays.'
      : 'Helps guests spot when collection has moved for public holidays.',
    chooserPatternTitle: 'Set up from my collection pattern',
    chooserPatternDetail: isUnitedKingdom
      ? 'Answer a few questions — we generate dates for the year.'
      : 'Answer a few questions about your local schedule.',
    chooserPasteTitle: isUnitedKingdom ? 'Paste dates from my council calendar' : 'Paste dates from my collection calendar',
    chooserPasteDetail: isUnitedKingdom
      ? 'One date per line when the pattern does not fit.'
      : 'One date per line when a simple pattern does not fit.',
    chooserPdfTitle: isUnitedKingdom ? 'Upload council PDF' : 'Upload collection calendar PDF',
    chooserPdfDetail: isUnitedKingdom
      ? 'Extract dates from your council calendar PDF — we tidy messy text if needed.'
      : 'Extract dates from a PDF calendar — we tidy messy text if needed.',
    showCouncilPdfUpload: isUnitedKingdom,
    pasteIntro: isUnitedKingdom
      ? 'Paste dates from a council PDF, email, or spreadsheet.'
      : 'Paste dates from your local service calendar, email, or spreadsheet.',
    councilUrlLabel: isUnitedKingdom ? 'Council bins website (optional)' : 'Local bins website (optional)',
    councilUrlPlaceholder: isUnitedKingdom
      ? 'https://www.example.gov.uk/bins'
      : 'https://example.com/bins'
  };
}

/**
 * @param {BinScheduleLocale} locale
 * @param {'owner' | 'airbnb' | 'housesitter' | 'both'} [useCase]
 */
export function binScheduleIntroForLocale(locale, useCase = 'owner') {
  const councilBit = locale.introUsesCouncilCalendar ? ' from your council calendar' : '';
  const settingsPath = 'Settings → Bin reminders';

  switch (useCase) {
    case 'airbnb':
      return `Set up bin reminders${councilBit}. Guests see the next collection on the home screen — useful when a stay crosses bin day. Use the pattern wizard, paste dates, or skip and finish later in ${settingsPath}.`;
    case 'housesitter':
    case 'both':
      return `Set up bin reminders${councilBit}. Guests see the next collection on the home screen before bin day. Use the pattern wizard, paste dates, or skip and finish later in ${settingsPath}.`;
    default:
      return locale.introUsesCouncilCalendar
        ? `Set up bin reminders from your council calendar. Use the pattern wizard, paste dates, or add them later in ${settingsPath}.`
        : `Set up bin reminders for your local collection schedule. Use the pattern wizard, paste dates, or add them later in ${settingsPath}.`;
  }
}
