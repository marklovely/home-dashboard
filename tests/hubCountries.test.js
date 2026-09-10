import { describe, expect, it } from 'vitest';
import {
  countryFlagEmoji,
  hubCountrySelectLabel,
  HUB_COUNTRY_OPTIONS,
  supportsAddressAutocomplete
} from '../src/lib/hubCountries.js';

describe('hubCountries', () => {
  it('adds flag emoji to country select labels', () => {
    const uk = HUB_COUNTRY_OPTIONS.find((option) => option.value === 'GB');
    expect(uk?.flag).toBe(countryFlagEmoji('GB'));
    expect(hubCountrySelectLabel(uk)).toMatch(/^🇬🇧 United Kingdom$/);
  });

  it('enables address autocomplete for listed countries except OTHER', () => {
    expect(supportsAddressAutocomplete('GB')).toBe(true);
    expect(supportsAddressAutocomplete('US')).toBe(true);
    expect(supportsAddressAutocomplete('OTHER')).toBe(false);
  });
});
