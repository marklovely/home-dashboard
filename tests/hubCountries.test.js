import { describe, expect, it } from 'vitest';
import { countryFlagEmoji, hubCountrySelectLabel, HUB_COUNTRY_OPTIONS } from '../src/lib/hubCountries.js';

describe('hubCountries', () => {
  it('adds flag emoji to country select labels', () => {
    const uk = HUB_COUNTRY_OPTIONS.find((option) => option.value === 'GB');
    expect(uk?.flag).toBe(countryFlagEmoji('GB'));
    expect(hubCountrySelectLabel(uk)).toMatch(/^🇬🇧 United Kingdom$/);
  });
});
