import { describe, expect, it } from 'vitest';
import { handleSiteProfileGet } from '../src/routes/siteSetupRoute.js';
import {
  createAccessTestEnv,
  signTestAccessJwt,
  withAccessJwt,
  withDeviceSessionCookie
} from './accessTestHelpers.js';
import { createInMemoryHubSetupDb } from './mocks/hubSetupStorage.js';
import { withTestLimiters } from './testEnv.js';

describe('hub setup routes', () => {
  it('allows GET /api/site/profile during onboarding while sitter cookie is active', async () => {
    const env = withTestLimiters({
      ...createAccessTestEnv(),
      HOUSE_GUIDE_DB: createInMemoryHubSetupDb()
    });
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleSiteProfileGet(
      new Request(
        'https://worker.test/api/site/profile',
        await withDeviceSessionCookie(jwt, env, 'sitter', Math.floor(Date.now() / 1000))
      ),
      env,
      'cid'
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile.onboardingComplete).toBe(false);
  });

  it('blocks GET /api/site/profile in sitter mode after onboarding is complete', async () => {
    const db = createInMemoryHubSetupDb();
    const env = withTestLimiters({
      ...createAccessTestEnv(),
      HOUSE_GUIDE_DB: db
    });

    await db
      .prepare(
        `INSERT INTO site_profile (id, payload, updated_at) VALUES (?, ?, ?)`
      )
      .bind('default', JSON.stringify({ onboardingComplete: true, hubName: 'Done' }), 1)
      .run();

    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleSiteProfileGet(
      new Request(
        'https://worker.test/api/site/profile',
        await withDeviceSessionCookie(jwt, env, 'sitter', Math.floor(Date.now() / 1000))
      ),
      env,
      'cid'
    );

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('DEVICE_MODE_REQUIRED');
  });

  it('allows GET /api/site/profile in owner device mode after onboarding is complete', async () => {
    const db = createInMemoryHubSetupDb();
    const env = withTestLimiters({
      ...createAccessTestEnv(),
      HOUSE_GUIDE_DB: db
    });

    await db
      .prepare(
        `INSERT INTO site_profile (id, payload, updated_at) VALUES (?, ?, ?)`
      )
      .bind('default', JSON.stringify({ onboardingComplete: true, hubName: 'Done' }), 1)
      .run();

    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleSiteProfileGet(
      new Request('https://worker.test/api/site/profile', withAccessJwt(jwt)),
      env,
      'cid'
    );

    expect(response.status).toBe(200);
  });

  it('treats legacy seeded hubs with a profile row as onboarding complete', async () => {
    const db = createInMemoryHubSetupDb({ guideSeeded: true });
    const env = withTestLimiters({
      ...createAccessTestEnv(),
      HOUSE_GUIDE_DB: db
    });

    await db
      .prepare(
        `INSERT INTO site_profile (id, payload, updated_at) VALUES (?, ?, ?)`
      )
      .bind('default', JSON.stringify({ onboardingComplete: false, hubName: 'Lovely Home' }), 1)
      .run();

    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleSiteProfileGet(
      new Request('https://worker.test/api/site/profile', withAccessJwt(jwt)),
      env,
      'cid'
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile.onboardingComplete).toBe(true);
    expect(body.guideSeeded).toBe(true);
  });
});
