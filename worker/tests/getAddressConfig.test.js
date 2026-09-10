import { describe, expect, it } from 'vitest';
import { normalizeGetAddressApiKey, resolveGetAddressConfig } from '../src/lib/getAddress.js';

describe('getAddress config', () => {
  it('strips quotes and whitespace from pasted API keys', () => {
    expect(normalizeGetAddressApiKey('"abc123"\n')).toBe('abc123');
    expect(normalizeGetAddressApiKey('  abc 123  ')).toBe('abc123');
  });

  it('reports configured when a normalized key exists', () => {
    expect(resolveGetAddressConfig({ GETADDRESS_API_KEY: '"test-key"\n' }).configured).toBe(true);
    expect(resolveGetAddressConfig({ GETADDRESS_API_KEY: '   ' }).configured).toBe(false);
  });
});
