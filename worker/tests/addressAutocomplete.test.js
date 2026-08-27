import { describe, expect, it, vi } from 'vitest';
import {
  handleAddressAutocomplete,
  handleAddressConfig,
  handleAddressLookup
} from '../src/routes/addressAutocomplete.js';
import {
  createAccessTestEnv,
  signTestAccessJwt,
  withAccessJwt
} from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';

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
    expect(body.suggestions).toEqual([]);
  });

  it('does not expose domain token from config endpoint', async () => {
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
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.configured).toBe(true);
    expect(body.domainToken).toBeUndefined();
    expect(body.lookupVia).toBeUndefined();
  });

  it('proxies autocomplete with domain token and Origin headers', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GETADDRESS_DOMAIN_TOKEN: 'dtoken_test',
        ALLOWED_ORIGINS: 'https://smith.lovely-hub.com'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async (_url, init) => {
      expect(String(_url)).toContain('api-key=dtoken_test');
      expect(init?.headers?.Origin).toBe('https://smith.lovely-hub.com');
      expect(init?.headers?.Referer).toBe('https://smith.lovely-hub.com/');
      return Response.json({
        suggestions: [{ id: 'abc', address: '41 Wagtail Way, Fareham' }]
      });
    });
    const response = await handleAddressAutocomplete(
      new Request(
        'https://worker.test/api/address/autocomplete?term=wagtail&country=GB',
        withAccessJwt(jwt, { headers: { Origin: 'https://smith.lovely-hub.com' } })
      ),
      env,
      fetchImpl
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.suggestions).toEqual([{ id: 'abc', label: '41 Wagtail Way, Fareham' }]);
  });

  it('returns suggestions when getAddress responds successfully with API key', async () => {
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
    expect(body.configured).toBe(true);
    expect(body.suggestions).toEqual([{ id: 'abc', label: '41 Wagtail Way, Fareham' }]);
  });

  it('returns INVALID_DOMAIN_TOKEN when domain token is rejected', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GETADDRESS_DOMAIN_TOKEN: 'dtoken_bad'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async () =>
      Response.json({ Message: 'Unauthorized' }, { status: 401 })
    );
    const response = await handleAddressAutocomplete(
      new Request(
        'https://worker.test/api/address/autocomplete?term=wagtail&country=GB',
        withAccessJwt(jwt)
      ),
      env,
      fetchImpl
    );
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe('INVALID_DOMAIN_TOKEN');
  });

  it('returns FETCH_FAILED when getAddress fetch throws', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GETADDRESS_API_KEY: 'test-key'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    const response = await handleAddressAutocomplete(
      new Request(
        'https://worker.test/api/address/autocomplete?term=wagtail&country=GB',
        withAccessJwt(jwt)
      ),
      env,
      fetchImpl
    );
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe('FETCH_FAILED');
  });

  it('resolves full address on worker lookup path', async () => {
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
