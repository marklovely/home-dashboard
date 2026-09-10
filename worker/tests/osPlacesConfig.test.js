import { describe, expect, it } from 'vitest';
import { normalizeOsPlacesApiKey, resolveOsPlacesConfig } from '../src/lib/osPlaces.js';

describe('OS Places config', () => {
  it('strips surrounding quotes and whitespace from pasted keys', () => {
    expect(normalizeOsPlacesApiKey('"test-key"\n')).toBe('test-key');
    expect(normalizeOsPlacesApiKey('   ')).toBe('');
  });

  it('reports configured when a key is present', () => {
    expect(resolveOsPlacesConfig({ OS_PLACES_API_KEY: '"test-key"\n' }).configured).toBe(true);
    expect(resolveOsPlacesConfig({ OS_PLACES_API_KEY: '   ' }).configured).toBe(false);
  });
});
