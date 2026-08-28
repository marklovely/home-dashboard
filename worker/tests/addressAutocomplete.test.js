import { describe, expect, it } from 'vitest';
import {
  handleAddressAutocomplete,
  handleAddressConfig,
  handleAddressLookup
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
