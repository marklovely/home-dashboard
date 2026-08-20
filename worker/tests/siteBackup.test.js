import { describe, expect, it } from 'vitest';
import {
  exportHubSecretsForBackup,
  hubSecretsForRestore,
  parseSiteBackupScope,
  restoreSiteBackupPayload,
  buildSiteBackupPayload
} from '../src/lib/siteBackupPayload.js';
import { getHubSecretsMap } from '../src/lib/hubSecrets.js';
import { createInMemoryHubSetupDb } from './mocks/hubSetupStorage.js';
import { createAccessTestEnv } from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';

describe('siteBackupPayload', () => {
  it('exports and restores hub secrets without device session secret', async () => {
    const db = createInMemoryHubSetupDb({ guideSeeded: true });
    const env = withTestLimiters({
      ...createAccessTestEnv(),
      HOUSE_GUIDE_DB: db
    });

    await db
      .prepare(
        `INSERT INTO hub_secrets (key, value, updated_at) VALUES (?, ?, ?)`
      )
      .bind('wifi_password', 'secret-wifi', 1)
      .run();
    await db
      .prepare(
        `INSERT INTO hub_secrets (key, value, updated_at) VALUES (?, ?, ?)`
      )
      .bind('device_session_secret', 'do-not-export', 1)
      .run();

    const secretsMap = Object.fromEntries(
      (await db.prepare(`SELECT key, value FROM hub_secrets`).all()).results?.map((row) => [
        String(row.key),
        String(row.value)
      ]) ?? []
    );

    expect(exportHubSecretsForBackup(secretsMap)).toEqual({ wifi_password: 'secret-wifi' });
    expect(exportHubSecretsForBackup(secretsMap).device_session_secret).toBeUndefined();

    await restoreSiteBackupPayload(env, {
      formatVersion: 1,
      backupScope: 'full',
      hubSecrets: { wifi_password: 'restored-wifi', owner_pin: '1234' },
      siteProfile: { hubName: 'Restored Hub', onboardingComplete: true },
      guide: { catalog: { version: 2, categories: [], media: {} } }
    });

    const secretsAfter = await getHubSecretsMap(env);
    expect(secretsAfter.wifi_password).toBe('restored-wifi');
    expect(secretsAfter.device_session_secret).toBe('do-not-export');
  });

  it('builds guide-only backups without profile or secrets', async () => {
    const db = createInMemoryHubSetupDb({ guideSeeded: false });
    const env = withTestLimiters({
      ...createAccessTestEnv(),
      HOUSE_GUIDE_DB: db
    });

    const payload = await buildSiteBackupPayload(env, { scope: 'guide' });
    expect(payload.backupScope).toBe('guide');
    expect(payload.siteProfile).toBeUndefined();
    expect(payload.hubSecrets).toBeUndefined();
  });

  it('parses backup scope query values', () => {
    expect(parseSiteBackupScope('guide')).toBe('guide');
    expect(parseSiteBackupScope('full')).toBe('full');
    expect(parseSiteBackupScope(null)).toBe('full');
  });

  it('normalizes hub secret restore patch', () => {
    expect(hubSecretsForRestore({ wifi_password: 'x', device_session_secret: 'nope' })).toEqual({
      wifi_password: 'x'
    });
  });
});
