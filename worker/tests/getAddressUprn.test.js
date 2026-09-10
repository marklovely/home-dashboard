import { describe, expect, it, vi } from 'vitest';
import {
  extractLeadingHouseToken,
  pickBestGetAddressSuggestion,
  resolveUprnFromAddress
} from '../src/bins/getAddressUprn.js';

describe('getAddress UPRN helpers', () => {
  it('extracts leading house numbers', () => {
    expect(extractLeadingHouseToken('41 Wagtail Way')).toBe('41');
    expect(extractLeadingHouseToken('10 Downing Street')).toBe('10');
  });

  it('prefers suggestions that match line 1', () => {
    const best = pickBestGetAddressSuggestion(
      [
        { id: 'a', address: '1 Other Road, Stratford-upon-Avon, CV37 6NT' },
        { id: 'b', address: '18 Chapel Lane, Stratford-upon-Avon, CV37 6NT' }
      ],
      { line1: '18 Chapel Lane', postcode: 'CV37 6NT' }
    );
    expect(best?.id).toBe('b');
  });
});

describe('resolveUprnFromAddress', () => {
  it('falls back to postcode autocomplete with all=true', async () => {
    const fetchImpl = vi.fn(async (url) => {
      const value = String(url);
      if (value.includes('/autocomplete/') && value.includes('all=true')) {
        return new Response(
          JSON.stringify({
            suggestions: [{ id: 'addr-18', address: '18 Chapel Lane, Stratford-upon-Avon, CV37 6NT' }]
          }),
          { status: 200 }
        );
      }
      if (value.includes('/autocomplete/')) {
        return new Response(JSON.stringify({ suggestions: [] }), { status: 200 });
      }
      if (value.includes('/get/addr-18')) {
        return new Response(JSON.stringify({ uprn: '100012345678' }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await resolveUprnFromAddress(
      { line1: '18 Chapel Lane', city: 'Stratford-upon-Avon', postcode: 'CV37 6NT' },
      'test-key',
      fetchImpl
    );

    expect(result.ok).toBe(true);
    expect(result.uprn).toBe('100012345678');
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes('all=true'))).toBe(true);
  });
});
