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
        line1: '1 Example Lane',
        line2: 'Example Cottage',
        city: 'Exampleton',
        county: 'Exampleshire',
        country: 'United Kingdom',
        postcode: 'EX1 2AB'
      })
    ).toBe('1 Example Lane\nExample Cottage\nExampleton\nExampleshire\nUnited Kingdom\nEX1 2AB');
  });

  it('returns empty when no address parts are set', () => {
    expect(formatPropertyAddress(EMPTY_PROPERTY_ADDRESS)).toBe('');
    expect(hasPropertyAddress(EMPTY_PROPERTY_ADDRESS)).toBe(false);
  });

  it('normalizes partial objects', () => {
    expect(normalizePropertyAddress({ line1: 'Flat 2', postcode: 'EX3 4CD' })).toEqual({
      line1: 'Flat 2',
      line2: '',
      line3: '',
      city: '',
      county: '',
      country: '',
      postcode: 'EX3 4CD'
    });
  });

  it('parses legacy multiline strings into fields', () => {
    expect(parsePropertyAddressFromString('1 Example Lane\nExampleton\nEX1 2AB')).toEqual({
      line1: '1 Example Lane',
      line2: 'Exampleton',
      line3: 'EX1 2AB',
      city: '',
      county: '',
      country: '',
      postcode: ''
    });
  });
});
