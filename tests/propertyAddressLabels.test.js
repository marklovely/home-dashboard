import { describe, expect, it } from 'vitest';
import { getPropertyAddressLabels } from '../src/lib/propertyAddressLabels.js';

describe('getPropertyAddressLabels', () => {
  it('uses UK county and postcode labels', () => {
    const labels = getPropertyAddressLabels('GB');
    expect(labels.countyLabel).toBe('County (optional)');
    expect(labels.postcodeLabel).toBe('Postcode');
  });

  it('uses US state and ZIP labels', () => {
    const labels = getPropertyAddressLabels('US');
    expect(labels.countyLabel).toBe('State');
    expect(labels.postcodeLabel).toBe('ZIP code');
    expect(labels.cityLabel).toBe('City');
  });

  it('falls back to generic labels for OTHER', () => {
    const labels = getPropertyAddressLabels('OTHER');
    expect(labels.postcodeLabel).toBe('Post code');
    expect(labels.countyLabel).toBe('Region (optional)');
  });
});
