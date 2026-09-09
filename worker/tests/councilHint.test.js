import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolveCouncilHint } from '../src/bins/councilHint.js';
import { fetchGovUkLocalAuthority, formatUkPostcode } from '../src/bins/govUkLocalAuthority.js';
import { fetchUkBinDayCouncil, resetUkBinDayCacheForTests } from '../src/bins/ukBinDay.js';

describe('formatUkPostcode', () => {
  it('inserts the inward code space', () => {
    expect(formatUkPostcode('po89ld')).toBe('PO8 9LD');
    expect(formatUkPostcode('SW1A1AA')).toBe('SW1A 1AA');
  });
});

describe('GOV.UK local authority lookup', () => {
  it('follows slug lookup when postcode returns addresses', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            addresses: [
              {
                address: '1 Example Street',
                local_authority_slug: 'havant',
                local_authority_name: 'Havant Borough Council'
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            local_authority: {
              name: 'Havant Borough Council',
              homepage_url: 'http://www.havant.gov.uk/',
              tier: 'district',
              slug: 'havant'
            }
          }),
          { status: 200 }
        )
      );

    const result = await fetchGovUkLocalAuthority('PO8 9LD', fetchImpl);
    expect(result.ok).toBe(true);
    expect(result.authority?.homepageUrl).toBe('https://www.havant.gov.uk/');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://www.gov.uk/api/local-authority?postcode=PO8%209LD',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://www.gov.uk/api/local-authority/havant',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );
  });
});

describe('council hint lookup', () => {
  beforeEach(() => {
    resetUkBinDayCacheForTests();
  });

  it('combines GOV.UK council homepage with postcodes.io district', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url.includes('gov.uk/api/local-authority?postcode')) {
        return new Response(
          JSON.stringify({
            local_authority: {
              name: 'East Hampshire District Council',
              homepage_url: 'http://www.easthants.gov.uk/',
              tier: 'district',
              slug: 'east-hampshire'
            }
          }),
          { status: 200 }
        );
      }
      if (url.includes('postcodes.io')) {
        return new Response(
          JSON.stringify({
            result: {
              postcode: 'GU34 4AB',
              admin_district: 'East Hampshire',
              region: 'South East'
            }
          }),
          { status: 200 }
        );
      }
      if (url.includes('ukbinday.co.uk/api/v1/council/')) {
        return new Response(
          JSON.stringify({
            postcode: 'GU344AB',
            council_id: 'ukbcd_google_public_calendar_council',
            council_name: 'Google Calendar (Public)',
            candidates: []
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await resolveCouncilHint('GU34 4AB', fetchImpl);
    expect(result.status).toBe(200);
    expect(result.body.adminDistrict).toBe('East Hampshire');
    expect(result.body.councilName).toBe('East Hampshire District Council');
    expect(result.body.binsUrl).toBe('https://www.easthants.gov.uk/');
    expect(result.body.ukBinDaySupported).toBe(false);
    expect(result.body.suggestedPattern).toBe('alternating');
  });

  it('prefers ukbinday scraper URL when supported', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url.includes('gov.uk/api/local-authority?postcode')) {
        return new Response(
          JSON.stringify({
            local_authority: {
              name: 'Basingstoke and Deane Borough Council',
              homepage_url: 'https://www.basingstoke.gov.uk/',
              tier: 'district',
              slug: 'basingstoke-and-deane'
            }
          }),
          { status: 200 }
        );
      }
      if (url.includes('postcodes.io')) {
        return new Response(
          JSON.stringify({
            result: {
              postcode: 'RG21 4RG',
              admin_district: 'Basingstoke and Deane',
              region: 'South East'
            }
          }),
          { status: 200 }
        );
      }
      if (url.includes('ukbinday.co.uk/api/v1/council/')) {
        return new Response(
          JSON.stringify({
            postcode: 'RG214RG',
            council_id: 'hacs_basingstoke_gov_uk',
            council_name: 'Basingstoke and Deane',
            candidates: []
          }),
          { status: 200 }
        );
      }
      if (url.includes('ukbinday.co.uk/api/v1/councils')) {
        return new Response(
          JSON.stringify([
            {
              id: 'hacs_basingstoke_gov_uk',
              name: 'Basingstoke and Deane Borough Council',
              url: 'https://basingstoke.gov.uk',
              params: ['uprn']
            }
          ]),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await resolveCouncilHint('RG21 4RG', fetchImpl);
    expect(result.status).toBe(200);
    expect(result.body.binsUrl).toBe('https://basingstoke.gov.uk');
    expect(result.body.ukBinDaySupported).toBe(true);
  });

  it('rejects invalid postcodes', async () => {
    const result = await resolveCouncilHint('not-a-postcode');
    expect(result.status).toBe(400);
  });
});

describe('ukbinday council lookup', () => {
  beforeEach(() => {
    resetUkBinDayCacheForTests();
  });

  it('ignores google calendar fallback councils', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          postcode: 'PO89LD',
          council_id: 'ukbcd_google_public_calendar_council',
          council_name: 'Google Calendar (Public)',
          candidates: []
        }),
        { status: 200 }
      )
    );

    const result = await fetchUkBinDayCouncil('PO8 9LD', fetchImpl);
    expect(result.ok).toBe(true);
    expect(result.supported).toBe(false);
    expect(result.binsUrl).toBeNull();
  });
});
