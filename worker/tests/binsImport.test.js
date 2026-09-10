import { describe, expect, it, vi } from 'vitest';
import { handleBinsImportSchedule, handleBinsParseDates } from '../src/routes/binsImport.js';
import { createAccessTestEnv, signTestAccessJwt, withAccessJwt } from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';

describe('bins import routes', () => {
  it('requires authentication for import-schedule', async () => {
    const env = withTestLimiters(createAccessTestEnv());
    const response = await handleBinsImportSchedule(
      new Request('https://worker.test/api/bins/import-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcode: 'SW1A 1AA' })
      }),
      env
    );
    expect(response.status).toBe(401);
  });

  it('imports schedule when UPRN and council are available', async () => {
    const env = withTestLimiters(createAccessTestEnv({ OS_PLACES_API_KEY: 'test-key' }));
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes('api.os.uk/search/places/v1/postcode')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                DPA: {
                  UPRN: '100022334455',
                  ADDRESS: '10 Downing Street, London, SW1A 1AA',
                  MATCH: 1
                }
              }
            ]
          }),
          { status: 200 }
        );
      }
      if (String(url).includes('ukbinday.co.uk')) {
        return new Response(
          JSON.stringify({
            collections: [{ date: '2026-06-01', type: 'Rubbish' }]
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const response = await handleBinsImportSchedule(
      new Request(
        'https://worker.test/api/bins/import-schedule',
        withAccessJwt(jwt, {
          method: 'POST',
          body: JSON.stringify({
            postcode: 'SW1A 1AA',
            councilId: 'westminster',
            line1: '10 Downing Street',
            city: 'London'
          })
        })
      ),
      env,
      fetchImpl
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.source).toBe('ukbinday');
    expect(body.household).toHaveLength(1);
  });

  it('returns AI entries for parse-dates', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        AI: {
          run: vi.fn().mockResolvedValue({
            response: '[{"date":"2026-07-01","type":"gardenWaste"}]'
          })
        }
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);

    const response = await handleBinsParseDates(
      new Request(
        'https://worker.test/api/bins/parse-dates',
        withAccessJwt(jwt, {
          method: 'POST',
          body: JSON.stringify({ text: 'Brown bin 1 Jul 2026' })
        })
      ),
      env
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.entries).toEqual([{ date: '2026-07-01', type: 'gardenWaste' }]);
  });
});
