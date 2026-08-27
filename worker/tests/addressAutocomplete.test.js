import { describe, expect, it, vi } from 'vitest';
import {
  handleAddressAutocomplete,
  handleAddressConfig,
  handleAddressLookup
} from '../src/routes/addressAutocomplete.js';
import {
  DEFAULT_ADDRESS_LOOKUP_ORIGIN,
  normalizeGetAddressSecret,
  resolveAddressLookupOrigin,
  resolveAddressLookupUrls
} from '../src/lib/getAddress.js';
import {
  createAccessTestEnv,
  signTestAccessJwt,
  withAccessJwt
} from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';

describe('address lookup config', () => {
  it('strips surrounding quotes from pasted secrets', () => {
    expect(normalizeGetAddressSecret('"ak_test"')).toBe('ak_test');
  });

  it('defaults to Ideal Postcodes compatibility API', () => {
    expect(resolveAddressLookupOrigin({})).toBe(DEFAULT_ADDRESS_LOOKUP_ORIGIN);
    const urls = resolveAddressLookupUrls({});
    expect(urls.autocomplete).toBe(`${DEFAULT_ADDRESS_LOOKUP_ORIGIN}/autocomplete`);
  });

  it('allows overriding the lookup API origin', () => {
    expect(
      resolveAddressLookupOrigin({ ADDRESS_LOOKUP_API_ORIGIN: 'https://api.example.test/' })
    ).toBe('https://api.example.test');
  });
});

describe('address autocomplete', () => {
  it('returns configured false when no API key is set', async () => {
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
        GETADDRESS_API_KEY: 'ak_test'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleAddressConfig(
      new Request('https://worker.test/api/address/config', withAccessJwt(jwt)),
      env
    );
    const body = await response.json();
    expect(body.lookupVia).toBe('worker');
    expect(body.domainToken).toBeUndefined();
  });

  it('returns suggestions when upstream succeeds', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GETADDRESS_API_KEY: 'ak_test'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async (url) => {
      expect(String(url)).toContain(`${DEFAULT_ADDRESS_LOOKUP_ORIGIN}/autocomplete/`);
      return Response.json({
        suggestions: [{ id: 'abc', address: '41 Wagtail Way, Fareham' }]
      });
    });
    const response = await handleAddressAutocomplete(
      new Request(
        'https://worker.test/api/address/autocomplete?term=wagtail&country=GB',
        withAccessJwt(jwt)
      ),
      env,
      fetchImpl
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.suggestions).toEqual([{ id: 'abc', label: '41 Wagtail Way, Fareham' }]);
  });

  it('resolves full address on lookup', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GETADDRESS_API_KEY: 'ak_test'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async (url) => {
      expect(String(url)).toContain(`${DEFAULT_ADDRESS_LOOKUP_ORIGIN}/get/`);
      return Response.json({
        line_1: '41 Wagtail Way',
        town_or_city: 'Fareham',
        postcode: 'PO16 8AB'
      });
    });
    const response = await handleAddressLookup(
      new Request('https://worker.test/api/address/lookup?id=abc', withAccessJwt(jwt)),
      env,
      fetchImpl
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.address.line1).toBe('41 Wagtail Way');
  });
});
