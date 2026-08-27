import { describe, expect, it, vi } from 'vitest';
import {
  handleAddressAutocomplete,
  handleAddressConfig,
  handleAddressLookup
} from '../src/routes/addressAutocomplete.js';
import { normalizeGetAddressSecret } from '../src/lib/getAddress.js';
import {
  createAccessTestEnv,
  signTestAccessJwt,
  withAccessJwt
} from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';

describe('getAddress secrets', () => {
  it('strips surrounding quotes from pasted secrets', () => {
    expect(normalizeGetAddressSecret('"dtoken_abc"')).toBe('dtoken_abc');
    expect(normalizeGetAddressSecret("'dtoken_abc'")).toBe('dtoken_abc');
  });
});

describe('address autocomplete', () => {
  it('returns configured false when no getAddress secrets are set', async () => {
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

  it('returns domain token to authenticated config clients', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GETADDRESS_DOMAIN_TOKEN: 'dtoken_test'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleAddressConfig(
      new Request('https://worker.test/api/address/config', withAccessJwt(jwt)),
      env
    );
    const body = await response.json();
    expect(body.lookupVia).toBe('browser');
    expect(body.domainToken).toBe('dtoken_test');
  });

  it('returns USE_BROWSER_LOOKUP for worker autocomplete when domain token configured', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GETADDRESS_DOMAIN_TOKEN: 'dtoken_test'
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

  it('returns suggestions when API key proxy succeeds', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GETADDRESS_API_KEY: 'test-key'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async () =>
      Response.json({
        suggestions: [{ id: 'abc', address: '41 Wagtail Way, Fareham' }]
      })
    );
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

  it('resolves full address on worker API key path', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GETADDRESS_API_KEY: 'test-key'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async () =>
      Response.json({
        line_1: '41 Wagtail Way',
        town_or_city: 'Fareham',
        postcode: 'PO16 8AB'
      })
    );
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
