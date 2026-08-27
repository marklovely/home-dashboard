import { describe, expect, it, vi } from 'vitest';
import {
  handleAddressAutocomplete,
  handleAddressConfig,
  handleAddressLookup
} from '../src/routes/addressAutocomplete.js';
import {
  GOOGLE_PLACES_AUTOCOMPLETE_URL,
  mapGooglePlaceToPropertyAddress,
  normalizePlacesApiKey
} from '../src/lib/googlePlaces.js';
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
    expect(address.country).toBe('United Kingdom');
  });
});

describe('address autocomplete', () => {
  it('returns configured false when no Google Places API key is set', async () => {
    const env = withTestLimiters(createAccessTestEnv());
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleAddressAutocomplete(
      new Request(
        'https://worker.test/api/address/autocomplete?term=PO16&country=GB',
        withAccessJwt(jwt)
      ),
      env
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.configured).toBe(false);
  });

  it('returns worker lookup mode to authenticated config clients', async () => {
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
    expect(body.lookupVia).toBe('worker');
  });

  it('returns suggestions when Google Places succeeds', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GOOGLE_PLACES_API_KEY: 'AIza_test'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async (url, init) => {
      expect(url).toBe(GOOGLE_PLACES_AUTOCOMPLETE_URL);
      expect(init?.method).toBe('POST');
      return Response.json({
        suggestions: [
          {
            placePrediction: {
              placeId: 'ChIJ_test',
              text: { text: '41 Wagtail Way, Fareham' }
            }
          }
        ]
      });
    });
    const response = await handleAddressAutocomplete(
      new Request(
        'https://worker.test/api/address/autocomplete?term=wagtail&country=GB&sessionToken=abc',
        withAccessJwt(jwt)
      ),
      env,
      fetchImpl
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.suggestions).toEqual([{ id: 'ChIJ_test', label: '41 Wagtail Way, Fareham' }]);
  });

  it('resolves full address on lookup', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GOOGLE_PLACES_API_KEY: 'AIza_test'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async (url) => {
      expect(String(url)).toContain('https://places.googleapis.com/v1/places/ChIJ_test');
      return Response.json({
        postalAddress: {
          regionCode: 'GB',
          postalCode: 'PO16 8AB',
          locality: 'Fareham',
          administrativeArea: 'Hampshire',
          addressLines: ['41 Wagtail Way']
        }
      });
    });
    const response = await handleAddressLookup(
      new Request(
        'https://worker.test/api/address/lookup?id=ChIJ_test&country=GB&sessionToken=abc',
        withAccessJwt(jwt)
      ),
      env,
      fetchImpl
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.address.line1).toBe('41 Wagtail Way');
  });
});
