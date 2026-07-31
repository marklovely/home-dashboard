import { describe, expect, it } from 'vitest';
import { handlePrivateConfigRequest } from '../src/routes/privateConfigRoute.js';
import {
  handleHouseSettingsGet,
  handleSitterSecretsSetting
} from '../src/routes/houseSettingsRoute.js';
import { handleDeviceSession } from '../src/routes/deviceSessionRoute.js';
import { buildPrivateConfig } from '../src/routes/privateConfig.js';
import { getSitterSecretsDisclosed, setSitterSecretsDisclosed } from '../src/lib/houseSettings.js';
import {
  createAccessTestEnv,
  signTestAccessJwt,
  withAccessJwt,
  withDeviceSessionCookie,
  authedOwnerAccessRequest
} from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';
import { createInMemoryHouseSettingsDb } from './mocks/houseSettingsStorage.js';

const privateEnv = {
  PRIVATE_WIFI_SSID: 'GuestNet',
  PRIVATE_WIFI_PASSWORD: 'guest-pass',
  PRIVATE_HOME_ADDRESS: '1 Example Lane'
};

function createEnv(overrides = {}) {
  return withTestLimiters(
    createAccessTestEnv({
      HOUSE_GUIDE_DB: createInMemoryHouseSettingsDb(),
      ...privateEnv,
      ...overrides
    })
  );
}

describe('house settings', () => {
  it('defaults sitter secrets to withheld', async () => {
    const env = createEnv();
    expect(await getSitterSecretsDisclosed(env)).toBe(false);
  });

  it('owner can enable and disable sitter secret sharing', async () => {
    const env = createEnv();
    const jwt = await signTestAccessJwt('owner@example.com', env);

    const enable = await handleSitterSecretsSetting(
      new Request(
        'https://worker.test/api/house-settings/sitter-secrets',
        withAccessJwt(jwt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ disclosed: true })
        })
      ),
      env
    );
    expect(enable.status).toBe(200);
    expect((await enable.json()).sitterSecretsDisclosed).toBe(true);

    const disable = await handleSitterSecretsSetting(
      new Request(
        'https://worker.test/api/house-settings/sitter-secrets',
        withAccessJwt(jwt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ disclosed: false })
        })
      ),
      env
    );
    expect(disable.status).toBe(200);
    expect((await disable.json()).sitterSecretsDisclosed).toBe(false);
  });

  it('rejects sitter secret updates from non-owners', async () => {
    const env = createEnv();
    const jwt = await signTestAccessJwt('sitter@example.com', env);
    const response = await handleSitterSecretsSetting(
      new Request(
        'https://worker.test/api/house-settings/sitter-secrets',
        withAccessJwt(jwt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ disclosed: true })
        })
      ),
      env
    );
    expect(response.status).toBe(403);
  });

  it('includes sitterSecretsDisclosed on device session', async () => {
    const env = createEnv();
    await setSitterSecretsDisclosed(env, true);
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleDeviceSession(
      new Request('https://worker.test/api/device-session', withAccessJwt(jwt)),
      env
    );
    expect((await response.json()).sitterSecretsDisclosed).toBe(true);
  });

  it('authenticated clients can read house settings', async () => {
    const env = createEnv();
    await setSitterSecretsDisclosed(env, true);
    const jwt = await signTestAccessJwt('sitter@example.com', env);
    const response = await handleHouseSettingsGet(
      new Request('https://worker.test/api/house-settings', withAccessJwt(jwt)),
      env
    );
    expect(response.status).toBe(200);
    expect((await response.json()).sitterSecretsDisclosed).toBe(true);
  });
});

describe('private-config with sitter secret sharing', () => {
  it('blocks sitter device mode while secrets are withheld', async () => {
    const env = createEnv();
    const jwt = await signTestAccessJwt('sitter@example.com', env);
    const response = await handlePrivateConfigRequest(
      new Request(
        'https://worker.test/api/private-config',
        await withDeviceSessionCookie(jwt, env, 'sitter')
      ),
      env
    );
    expect(response.status).toBe(403);
  });

  it('allows sitter device mode when owner enabled secret sharing', async () => {
    const env = createEnv();
    await setSitterSecretsDisclosed(env, true);
    const jwt = await signTestAccessJwt('sitter@example.com', env);
    const response = await handlePrivateConfigRequest(
      new Request(
        'https://worker.test/api/private-config',
        await withDeviceSessionCookie(jwt, env, 'sitter')
      ),
      env
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.wifi.password).toBe('guest-pass');
    expect(body.home.address).toBe('1 Example Lane');
  });

  it('still allows owner device mode without the toggle', async () => {
    const env = createEnv();
    const response = await handlePrivateConfigRequest(
      await authedOwnerAccessRequest('https://worker.test/api/private-config', env),
      env
    );
    expect(response.status).toBe(200);
    expect(buildPrivateConfig(env).wifi.password).toBe('guest-pass');
  });
});
