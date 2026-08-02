import { describe, expect, it } from 'vitest';
import {
  EMPTY_PROPERTY_ADDRESS,
  formatPropertyAddress,
  hasPropertyAddress,
  normalizePropertyAddress,
  parsePropertyAddressFromString
} from '../src/lib/propertyAddress.js';

describe('propertyAddress', () => {
  it('formats structured lines into a multiline secret value', () => {
    expect(
      formatPropertyAddress({
        line1: '12 Wagtail Road',
        line2: 'Rose Cottage',
        city: 'Waterlooville',
        county: 'Hampshire',
        country: 'United Kingdom',
        postcode: 'PO8 9YD'
      })
    ).toBe('12 Wagtail Road\nRose Cottage\nWaterlooville\nHampshire\nUnited Kingdom\nPO8 9YD');
  });

  it('returns empty when no address parts are set', () => {
    expect(formatPropertyAddress(EMPTY_PROPERTY_ADDRESS)).toBe('');
    expect(hasPropertyAddress(EMPTY_PROPERTY_ADDRESS)).toBe(false);
  });

  it('normalizes partial objects', () => {
    expect(normalizePropertyAddress({ line1: 'Flat 2', postcode: 'PO7 7UL' })).toEqual({
      line1: 'Flat 2',
      line2: '',
      line3: '',
      city: '',
      county: '',
      country: '',
      postcode: 'PO7 7UL'
    });
  });

  it('parses legacy multiline strings into fields', () => {
    expect(parsePropertyAddressFromString('12 Wagtail Road\nWaterlooville\nPO8 9YD')).toEqual({
      line1: '12 Wagtail Road',
      line2: 'Waterlooville',
      line3: 'PO8 9YD',
      city: '',
      county: '',
      country: '',
      postcode: ''
    });
  });
});
