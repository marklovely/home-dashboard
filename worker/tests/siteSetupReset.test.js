import { describe, expect, it } from 'vitest';
import { handleHubSecretsStatusGet } from '../src/routes/siteSetupRoute.js';
import { resetHubToDefaults } from '../src/routes/siteSetupRoute.js';
import {
  createAccessTestEnv,
  signTestAccessJwt,
  withAccessJwt
} from './accessTestHelpers.js';
import { createInMemoryHubSetupDb } from './mocks/hubSetupStorage.js';
import { withTestLimiters } from './testEnv.js';

describe('resetHubToDefaults', () => {
  it('clears scheduled sitter stays during factory reset', async () => {
    const db = createInMemoryHubSetupDb();
    await db
      .prepare(
        `INSERT INTO sitter_stays (
           id, label, emails_json, sit_start, sit_end,
           access_opens_at, access_closes_at, secrets_opens_at, secrets_closes_at,
           status, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind('stay-1', 'March sit', '["sitter@example.com"]', '2026-03-12', '2026-03-19', 100, 500, 200, 400, 'scheduled', 1, 1)
      .run();

    const env = withTestLimiters({
      ...createAccessTestEnv(),
      HOUSE_GUIDE_DB: db
    });

    await resetHubToDefaults(env);

    const stays = await db.prepare('SELECT id FROM sitter_stays').all();
    expect(stays.results).toEqual([]);
  });

  it('clears hub secrets and site profile during factory reset', async () => {
    const db = createInMemoryHubSetupDb({ guideSeeded: true });
    await db
      .prepare(`INSERT INTO hub_secrets (key, value, updated_at) VALUES (?, ?, ?)`)
      .bind('wifi_ssid', 'OldNet', 1)
      .run();
    await db
      .prepare(`INSERT INTO site_profile (id, payload, updated_at) VALUES (?, ?, ?)`)
      .bind('default', JSON.stringify({ hubName: 'Old Hub', onboardingComplete: true }), 1)
      .run();

    const env = withTestLimiters({
      ...createAccessTestEnv(),
      HOUSE_GUIDE_DB: db
    });

    const result = await resetHubToDefaults(env);
    const secrets = await db.prepare('SELECT key, value FROM hub_secrets').all();
    const profile = await db.prepare('SELECT payload FROM site_profile WHERE id = ?').bind('default').first();

    expect(secrets.results).toEqual([]);
    expect(JSON.parse(String(profile?.payload ?? '{}')).onboardingComplete).toBe(false);
    expect(result.guideSeeded).toBe(false);
  });
});

describe('hub secrets status', () => {
  it('returns stored flags separately from deployment fallbacks', async () => {
    const db = createInMemoryHubSetupDb();
    await db
      .prepare(`INSERT INTO hub_secrets (key, value, updated_at) VALUES (?, ?, ?)`)
      .bind('wifi_password', 'secret-pass', 1)
      .run();

    const env = withTestLimiters({
      ...createAccessTestEnv({
        PRIVATE_WIFI_SSID: 'DeployedNet',
        OWNER_PIN: '1234'
      }),
      HOUSE_GUIDE_DB: db
    });

    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleHubSecretsStatusGet(
      new Request('https://worker.test/api/site/secrets/status', withAccessJwt(jwt)),
      env,
      'cid'
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.stored.wifi_password).toBe(true);
    expect(body.stored.wifi_ssid).toBe(false);
    expect(body.configured.wifi_ssid).toBe(true);
    expect(body.configured.owner_pin).toBe(true);
    expect(body.stored.owner_pin).toBe(false);
  });
});
