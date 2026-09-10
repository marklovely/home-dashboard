import { describe, expect, it, vi } from 'vitest';
import {
  extractLeadingHouseToken,
  pickBestUprnCandidate
} from '../src/bins/uprnMatch.js';
import { resolveUprnFromAddress } from '../src/bins/osPlacesUprn.js';

describe('OS Places UPRN helpers', () => {
  it('extracts leading house numbers', () => {
    expect(extractLeadingHouseToken('41 Wagtail Way')).toBe('41');
    expect(extractLeadingHouseToken('10 Downing Street')).toBe('10');
  });

  it('prefers candidates that match line 1', () => {
    const best = pickBestUprnCandidate(
      [
        { uprn: '1', address: '1 Other Road, Stratford-upon-Avon, CV37 6NT' },
        { uprn: '2', address: '18 Chapel Lane, Stratford-upon-Avon, CV37 6NT' }
      ],
      { line1: '18 Chapel Lane', postcode: 'CV37 6NT' }
    );
    expect(best?.uprn).toBe('2');
  });
});

describe('resolveUprnFromAddress', () => {
  it('resolves UPRN from postcode lookup', async () => {
    const fetchImpl = vi.fn(async (url) => {
      const value = String(url);
      if (value.includes('/postcode?')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                DPA: {
                  UPRN: '100012345678',
                  ADDRESS: '18 Chapel Lane, Stratford-upon-Avon, CV37 6NT',
                  MATCH: 1
                }
              }
            ]
          }),
          { status: 200 }
        );
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
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes('/postcode?'))).toBe(true);
  });

  it('falls back to find when postcode lookup has no match', async () => {
    const fetchImpl = vi.fn(async (url) => {
      const value = String(url);
      if (value.includes('/postcode?')) {
        return new Response(JSON.stringify({ results: [] }), { status: 200 });
      }
      if (value.includes('/find?')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                DPA: {
                  UPRN: '100099887766',
                  ADDRESS: '10 Downing Street, London, SW1A 2AA',
                  MATCH: 1
                }
              }
            ]
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await resolveUprnFromAddress(
      { line1: '10 Downing Street', city: 'London', postcode: 'SW1A 2AA' },
      'test-key',
      fetchImpl
    );

    expect(result.ok).toBe(true);
    expect(result.uprn).toBe('100099887766');
  });
});
