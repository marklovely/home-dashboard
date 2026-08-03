import { describe, expect, it } from 'vitest';
import { buildWeatherGeocodeQuery } from '../src/services/weatherLocationFromProfile.js';

describe('weatherLocationFromProfile', () => {
  it('prefers postcode for geocode lookup', () => {
    expect(
      buildWeatherGeocodeQuery({
        line1: '1 Wagtail Road',
        city: 'Waterlooville',
        postcode: 'PO8 9ZZ'
      })
    ).toBe('PO8 9ZZ');
  });

  it('falls back to address lines when postcode is blank', () => {
    expect(
      buildWeatherGeocodeQuery({
        line1: 'Rose Cottage',
        city: 'Chichester',
        country: 'United Kingdom'
      })
    ).toBe('Rose Cottage, Chichester, United Kingdom');
  });
});
