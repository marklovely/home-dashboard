import { normalizeHubCountryCode } from './hubCountries.js';

/**
 * @typedef {{
 *   countyLabel: string,
 *   postcodeLabel: string,
 *   cityLabel: string,
 *   searchHint: string,
 *   searchPlaceholder: string,
 *   enterPostcodeMessage: string,
 *   invalidPostcodeMessage: string
 * }} PropertyAddressLabels
 */

/** @type {PropertyAddressLabels} */
const DEFAULT_LABELS = {
  countyLabel: 'Region (optional)',
  postcodeLabel: 'Post code',
  cityLabel: 'City / town',
  searchHint: 'Start typing a street address or post code, then pick your address from the list.',
  searchPlaceholder: 'Street address or post code',
  enterPostcodeMessage: 'Enter post code.',
  invalidPostcodeMessage: 'Post code looks invalid for the selected country.'
};

/** @type {Record<string, Partial<PropertyAddressLabels>>} */
const LABEL_OVERRIDES = {
  GB: {
    countyLabel: 'County (optional)',
    postcodeLabel: 'Postcode',
    searchHint: 'Start typing a postcode or street name, then pick your address from the list.',
    searchPlaceholder: 'e.g. SW1A 1AA or 10 Downing Street',
    enterPostcodeMessage: 'Enter postcode.',
    invalidPostcodeMessage: 'Postcode looks invalid for the selected country.'
  },
  IE: {
    countyLabel: 'County (optional)',
    postcodeLabel: 'Eircode',
    searchHint: 'Start typing an Eircode or street name, then pick your address from the list.',
    searchPlaceholder: 'e.g. D02 X285 or Grafton Street',
    enterPostcodeMessage: 'Enter Eircode.',
    invalidPostcodeMessage: 'Eircode looks invalid for the selected country.'
  },
  US: {
    countyLabel: 'State',
    postcodeLabel: 'ZIP code',
    cityLabel: 'City',
    searchHint: 'Start typing a ZIP code or street address, then pick your address from the list.',
    searchPlaceholder: 'e.g. 90210 or 1600 Pennsylvania Avenue',
    enterPostcodeMessage: 'Enter ZIP code.',
    invalidPostcodeMessage: 'ZIP code looks invalid for the selected country.'
  },
  CA: {
    countyLabel: 'Province (optional)',
    postcodeLabel: 'Postal code',
    searchHint: 'Start typing a postal code or street address, then pick your address from the list.',
    searchPlaceholder: 'e.g. M5V 3A8 or 24 Sussex Drive',
    enterPostcodeMessage: 'Enter postal code.',
    invalidPostcodeMessage: 'Postal code looks invalid for the selected country.'
  },
  AU: {
    countyLabel: 'State (optional)',
    postcodeLabel: 'Postcode',
    searchHint: 'Start typing a postcode or street address, then pick your address from the list.',
    searchPlaceholder: 'e.g. 2000 or 1 Macquarie Street',
    enterPostcodeMessage: 'Enter postcode.',
    invalidPostcodeMessage: 'Postcode looks invalid for the selected country.'
  },
  NZ: {
    countyLabel: 'Region (optional)',
    postcodeLabel: 'Postcode',
    searchHint: 'Start typing a postcode or street address, then pick your address from the list.',
    searchPlaceholder: 'e.g. 6011 or Queen Street',
    enterPostcodeMessage: 'Enter postcode.',
    invalidPostcodeMessage: 'Postcode looks invalid for the selected country.'
  },
  FR: {
    countyLabel: 'Department (optional)',
    postcodeLabel: 'Postal code',
    searchPlaceholder: 'e.g. 75001 or 10 Rue de Rivoli',
    enterPostcodeMessage: 'Enter postal code.',
    invalidPostcodeMessage: 'Postal code looks invalid for the selected country.'
  },
  DE: {
    countyLabel: 'State (optional)',
    postcodeLabel: 'Postal code',
    searchPlaceholder: 'e.g. 10115 or Unter den Linden',
    enterPostcodeMessage: 'Enter postal code.',
    invalidPostcodeMessage: 'Postal code looks invalid for the selected country.'
  },
  ES: {
    countyLabel: 'Province (optional)',
    postcodeLabel: 'Postal code',
    searchPlaceholder: 'e.g. 28001 or Calle Mayor',
    enterPostcodeMessage: 'Enter postal code.',
    invalidPostcodeMessage: 'Postal code looks invalid for the selected country.'
  },
  IT: {
    countyLabel: 'Province (optional)',
    postcodeLabel: 'Postal code',
    searchPlaceholder: 'e.g. 00118 or Via del Corso',
    enterPostcodeMessage: 'Enter postal code.',
    invalidPostcodeMessage: 'Postal code looks invalid for the selected country.'
  },
  NL: {
    countyLabel: 'Province (optional)',
    postcodeLabel: 'Postcode',
    searchPlaceholder: 'e.g. 1012 JS or Damrak',
    enterPostcodeMessage: 'Enter postcode.',
    invalidPostcodeMessage: 'Postcode looks invalid for the selected country.'
  },
  BE: {
    countyLabel: 'Province (optional)',
    postcodeLabel: 'Postal code',
    enterPostcodeMessage: 'Enter postal code.',
    invalidPostcodeMessage: 'Postal code looks invalid for the selected country.'
  },
  CH: {
    countyLabel: 'Canton (optional)',
    postcodeLabel: 'Postal code',
    enterPostcodeMessage: 'Enter postal code.',
    invalidPostcodeMessage: 'Postal code looks invalid for the selected country.'
  },
  PT: {
    countyLabel: 'District (optional)',
    postcodeLabel: 'Postal code',
    enterPostcodeMessage: 'Enter postal code.',
    invalidPostcodeMessage: 'Postal code looks invalid for the selected country.'
  },
  SE: {
    countyLabel: 'County (optional)',
    postcodeLabel: 'Postcode',
    enterPostcodeMessage: 'Enter postcode.',
    invalidPostcodeMessage: 'Postcode looks invalid for the selected country.'
  },
  NO: {
    countyLabel: 'County (optional)',
    postcodeLabel: 'Postcode',
    enterPostcodeMessage: 'Enter postcode.',
    invalidPostcodeMessage: 'Postcode looks invalid for the selected country.'
  },
  DK: {
    countyLabel: 'Region (optional)',
    postcodeLabel: 'Postcode',
    enterPostcodeMessage: 'Enter postcode.',
    invalidPostcodeMessage: 'Postcode looks invalid for the selected country.'
  },
  AT: {
    countyLabel: 'State (optional)',
    postcodeLabel: 'Postal code',
    enterPostcodeMessage: 'Enter postal code.',
    invalidPostcodeMessage: 'Postal code looks invalid for the selected country.'
  },
  PL: {
    countyLabel: 'Voivodeship (optional)',
    postcodeLabel: 'Postal code',
    enterPostcodeMessage: 'Enter postal code.',
    invalidPostcodeMessage: 'Postal code looks invalid for the selected country.'
  }
};

/**
 * Labels and hints for property address fields by hub country.
 * @param {string | undefined | null} hubCountryCode
 * @returns {PropertyAddressLabels}
 */
export function getPropertyAddressLabels(hubCountryCode) {
  const code = normalizeHubCountryCode(hubCountryCode);
  const overrides = LABEL_OVERRIDES[code] ?? {};
  return { ...DEFAULT_LABELS, ...overrides };
}
