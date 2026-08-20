import { describe, expect, it } from 'vitest';
import { handleRequest } from '../src/index.js';
import { BRAND_LOGO_OBJECT_KEY } from '../src/lib/brandMediaStorage.js';
import { createAccessTestEnv, signTestAccessJwt, withAccessJwt } from './accessTestHelpers.js';
import { createInMemoryR2Bucket } from './mocks/applianceManualsStorage.js';
import { withTestLimiters } from './testEnv.js';

const env = withTestLimiters(createAccessTestEnv());

async function authedRequest(url, init = {}, email = 'owner@example.com') {
  const token = await signTestAccessJwt(email, env);
  return new Request(url, withAccessJwt(token, init));
}

describe('branding logo', () => {
  it('streams the logo for Access-authenticated users', async () => {
    const bucket = createInMemoryR2Bucket();
    await bucket.put(BRAND_LOGO_OBJECT_KEY, new Uint8Array([137, 80, 78, 71]), {
      httpMetadata: { contentType: 'image/png' }
    });

    const response = await handleRequest(
      await authedRequest('https://worker.test/api/branding/logo'),
      { ...env, BRAND_MEDIA: bucket }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  it('returns 404 when the logo object is missing', async () => {
    const response = await handleRequest(
      await authedRequest('https://worker.test/api/branding/logo'),
      { ...env, BRAND_MEDIA: createInMemoryR2Bucket() }
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('rejects unauthenticated requests', async () => {
    const response = await handleRequest(new Request('https://worker.test/api/branding/logo'), {
      ...env,
      BRAND_MEDIA: createInMemoryR2Bucket()
    });

    expect(response.status).toBe(401);
  });
});
