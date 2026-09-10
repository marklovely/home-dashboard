import { describe, expect, it, vi } from 'vitest';
import {
  handleAddressAutocomplete,
  handleAddressConfig,
  handleAddressLookup,
  handleAddressResolveUprn
} from '../src/routes/addressAutocomplete.js';
import { mapGooglePlaceToPropertyAddress, normalizePlacesApiKey } from '../src/lib/googlePlaces.js';
import {
  createAccessTestEnv,
  signTestAccessJwt,
  withAccessJwt
} from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';

describe('googlePlaces helpers', () => {
  it('strips surrounding quotes from pasted API keys', () => {
    expect(normalizePlacesApiKey('"AIza_test"')).toBe('AIza_test');
  });

  it('maps Google place details to hub address fields', () => {
    const address = mapGooglePlaceToPropertyAddress(
      {
        postalAddress: {
          regionCode: 'GB',
          postalCode: 'PO16 8AB',
          locality: 'Fareham',
          administrativeArea: 'Hampshire',
          addressLines: ['41 Wagtail Way']
        }
      },
      'GB'
    );
    expect(address.line1).toBe('41 Wagtail Way');
    expect(address.postcode).toBe('PO16 8AB');
  });
});

describe('address autocomplete routes', () => {
  it('returns configured false when no Google Places API key is set', async () => {
    const env = withTestLimiters(createAccessTestEnv());
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleAddressConfig(
      new Request('https://worker.test/api/address/config', withAccessJwt(jwt)),
      env
    );
    const body = await response.json();
    expect(body.configured).toBe(false);
  });

  it('returns browser config with API key to authenticated clients', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GOOGLE_PLACES_API_KEY: 'AIza_test'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleAddressConfig(
      new Request('https://worker.test/api/address/config', withAccessJwt(jwt)),
      env
    );
    const body = await response.json();
    expect(body.lookupVia).toBe('browser');
    expect(body.placesApiKey).toBe('AIza_test');
    expect(body.uprnLookupConfigured).toBe(false);
  });

  it('exposes OS Places config for UPRN lookup when configured', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GOOGLE_PLACES_API_KEY: 'AIza_test',
        OS_PLACES_API_KEY: 'os_test'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleAddressConfig(
      new Request('https://worker.test/api/address/config', withAccessJwt(jwt)),
      env
    );
    const body = await response.json();
    expect(body.uprnLookupConfigured).toBe(true);
    expect(body.osPlacesApiKey).toBeUndefined();
  });

  it('resolves UPRN via OS Places on the Worker', async () => {
    const env = withTestLimiters(createAccessTestEnv({ OS_PLACES_API_KEY: 'os_test' }));
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes('api.os.uk/search/places/v1/postcode')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                DPA: {
                  UPRN: '100012345678',
                  ADDRESS: '1 High Street, Stratford-upon-Avon, CV37 6NT',
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

    const response = await handleAddressResolveUprn(
      new Request(
        'https://worker.test/api/address/resolve-uprn',
        withAccessJwt(jwt, {
          method: 'POST',
          body: JSON.stringify({
            line1: '1 High Street',
            city: 'Stratford-upon-Avon',
            postcode: 'CV37 6NT'
          })
        })
      ),
      env,
      fetchImpl
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.uprn).toBe('100012345678');
  });

  it('returns USE_BROWSER_LOOKUP for worker autocomplete', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GOOGLE_PLACES_API_KEY: 'AIza_test'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleAddressAutocomplete(
      new Request(
        'https://worker.test/api/address/autocomplete?term=wagtail&country=GB',
        withAccessJwt(jwt)
      ),
      env
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('USE_BROWSER_LOOKUP');
  });

  it('returns USE_BROWSER_LOOKUP for worker lookup', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GOOGLE_PLACES_API_KEY: 'AIza_test'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleAddressLookup(
      new Request('https://worker.test/api/address/lookup?id=ChIJ_test', withAccessJwt(jwt)),
      env
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('USE_BROWSER_LOOKUP');
  });
});
