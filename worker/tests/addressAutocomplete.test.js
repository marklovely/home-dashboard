import { describe, expect, it, vi } from 'vitest';
import { handleAddressAutocomplete } from '../src/routes/addressAutocomplete.js';
import {
  createAccessTestEnv,
  signTestAccessJwt,
  withAccessJwt
} from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';

describe('address autocomplete', () => {
  it('returns configured false when GETADDRESS_API_KEY is missing', async () => {
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

  it('returns suggestions when getAddress responds successfully', async () => {
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

  it('returns INVALID_API_KEY when getAddress responds with 401', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GETADDRESS_API_KEY: 'bad-key'
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
    expect(body.error).toBe('INVALID_API_KEY');
    expect(body.message).toMatch(/API key/i);
  });

  it('sends User-Agent when calling getAddress', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GETADDRESS_API_KEY: 'test-key'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async (_url, init) => {
      expect(init?.headers?.['User-Agent']).toMatch(/LovelyHomeHub/);
      return Response.json({ suggestions: [] });
    });
    await handleAddressAutocomplete(
      new Request(
        'https://worker.test/api/address/autocomplete?term=wagtail&country=GB',
        withAccessJwt(jwt)
      ),
      env,
      fetchImpl
    );
  });

  it('includes upstream status when getAddress responds with 403', async () => {
    const env = withTestLimiters(
      createAccessTestEnv({
        GETADDRESS_API_KEY: 'test-key'
      })
    );
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async () => new Response('Forbidden', { status: 403 }));
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
    expect(body.upstreamStatus).toBe(403);
    expect(body.message).toMatch(/blocked/i);
  });
});
